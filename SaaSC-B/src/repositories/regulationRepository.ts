import type { PoolClient } from 'pg';
import { pool } from '../db/index.js';

export interface RegulationClauseInput { codigo?: string | null; texto: string; orden?: number }
export interface RegulationArticleInput { codigo: string; titulo: string; orden?: number; clausulas: RegulationClauseInput[] }
export interface RegulationDraftInput { nombre: string; documento_key?: string | null; documento_nombre?: string | null; articulos: RegulationArticleInput[] }

async function replaceArticles(client: PoolClient, regulationId: string, articles: RegulationArticleInput[]) {
  await client.query('DELETE FROM reglamento_articulos WHERE reglamento_id=$1', [regulationId]);
  for (const [index, article] of articles.entries()) {
    const inserted = await client.query<{id:string}>(
      `INSERT INTO reglamento_articulos(reglamento_id,codigo,titulo,orden) VALUES($1,$2,$3,$4) RETURNING id`,
      [regulationId, article.codigo, article.titulo, article.orden ?? index + 1],
    );
    const articleId = inserted.rows[0]!.id;
    for (const [clauseIndex, clause] of article.clausulas.entries()) {
      await client.query(
        `INSERT INTO reglamento_clausulas(articulo_id,codigo,texto,orden) VALUES($1,$2,$3,$4)`,
        [articleId, clause.codigo || null, clause.texto, clause.orden ?? clauseIndex + 1],
      );
    }
  }
}

export async function listRegulations(condominioId: string) {
  const result = await pool.query(`
    SELECT r.id,r.nombre,r.version,r.estatus,r.vigente_desde,r.vigente_hasta,r.documento_key,
           r.documento_nombre,r.creado_en,r.actualizado_en,r.publicado_en,
           COUNT(DISTINCT a.id)::int AS total_articulos, COUNT(c.id)::int AS total_clausulas
    FROM reglamentos r
    LEFT JOIN reglamento_articulos a ON a.reglamento_id=r.id
    LEFT JOIN reglamento_clausulas c ON c.articulo_id=a.id
    WHERE r.condominio_id=$1
    GROUP BY r.id ORDER BY r.version DESC
  `, [condominioId]);
  return result.rows;
}

export async function getRegulation(regulationId: string, condominioId: string) {
  const result = await pool.query(`
    SELECT r.id,r.nombre,r.version,r.estatus,r.vigente_desde,r.vigente_hasta,r.documento_key,
           r.documento_nombre,r.creado_en,r.actualizado_en,r.publicado_en,
           COALESCE(jsonb_agg(jsonb_build_object(
             'id',a.id,'codigo',a.codigo,'titulo',a.titulo,'orden',a.orden,
             'clausulas',COALESCE((SELECT jsonb_agg(jsonb_build_object(
               'id',c.id,'codigo',c.codigo,'texto',c.texto,'orden',c.orden
             ) ORDER BY c.orden) FROM reglamento_clausulas c WHERE c.articulo_id=a.id),'[]'::jsonb)
           ) ORDER BY a.orden) FILTER (WHERE a.id IS NOT NULL),'[]'::jsonb) AS articulos
    FROM reglamentos r
    LEFT JOIN reglamento_articulos a ON a.reglamento_id=r.id
    WHERE r.id=$1 AND r.condominio_id=$2
    GROUP BY r.id
  `, [regulationId, condominioId]);
  return result.rows[0] || null;
}

export async function getEditableRegulation(condominioId: string) {
  const result = await pool.query<{id:string}>(`
    SELECT id FROM reglamentos WHERE condominio_id=$1
    ORDER BY CASE estatus WHEN 'BORRADOR' THEN 0 WHEN 'VIGENTE' THEN 1 ELSE 2 END, version DESC LIMIT 1
  `, [condominioId]);
  return result.rows[0] ? getRegulation(result.rows[0].id, condominioId) : null;
}

export async function createRegulationDraft(condominioId: string, adminId: string, input: RegulationDraftInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`regulation:${condominioId}`]);
    const versionResult = await client.query<{version:number}>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM reglamentos WHERE condominio_id=$1`, [condominioId]);
    const inserted = await client.query<{id:string}>(`
      INSERT INTO reglamentos(condominio_id,nombre,version,estatus,documento_key,documento_nombre,creado_por)
      VALUES($1,$2,$3,'BORRADOR',$4,$5,$6) RETURNING id
    `, [condominioId, input.nombre, versionResult.rows[0]!.version, input.documento_key || null, input.documento_nombre || null, adminId]);
    const regulationId = inserted.rows[0]!.id;
    await replaceArticles(client, regulationId, input.articulos);
    await client.query('COMMIT');
    return getRegulation(regulationId, condominioId);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function updateRegulationDraft(regulationId: string, condominioId: string, input: RegulationDraftInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query<{id:string}>(`
      UPDATE reglamentos SET nombre=$3,documento_key=COALESCE($4,documento_key),
        documento_nombre=COALESCE($5,documento_nombre),actualizado_en=CURRENT_TIMESTAMP
      WHERE id=$1 AND condominio_id=$2 AND estatus='BORRADOR' RETURNING id
    `, [regulationId, condominioId, input.nombre, input.documento_key || null, input.documento_nombre || null]);
    if (!updated.rows[0]) { await client.query('ROLLBACK'); return null; }
    await replaceArticles(client, regulationId, input.articulos);
    await client.query('COMMIT');
    return getRegulation(regulationId, condominioId);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function duplicateCurrentRegulation(condominioId: string, adminId: string) {
  const current = await pool.query<{id:string}>(`SELECT id FROM reglamentos WHERE condominio_id=$1 AND estatus='VIGENTE'`, [condominioId]);
  if (!current.rows[0]) return null;
  const source = await getRegulation(current.rows[0].id, condominioId);
  if (!source) return null;
  return createRegulationDraft(condominioId, adminId, {
    nombre: source.nombre,
    documento_key: source.documento_key,
    documento_nombre: source.documento_nombre,
    articulos: source.articulos,
  });
}

function catalogCode(code: string) {
  return `ART_${code.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 20);
}

export async function publishRegulation(regulationId: string, condominioId: string, adminId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`regulation:${condominioId}`]);
    const draft = await client.query(`SELECT id FROM reglamentos WHERE id=$1 AND condominio_id=$2 AND estatus='BORRADOR' FOR UPDATE`, [regulationId, condominioId]);
    if (!draft.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query(`UPDATE reglamentos SET estatus='DEROGADO',vigente_hasta=CURRENT_DATE,actualizado_en=CURRENT_TIMESTAMP WHERE condominio_id=$1 AND estatus='VIGENTE'`, [condominioId]);
    await client.query(`UPDATE reglamentos SET estatus='VIGENTE',vigente_desde=CURRENT_DATE,vigente_hasta=NULL,publicado_por=$3,publicado_en=CURRENT_TIMESTAMP,actualizado_en=CURRENT_TIMESTAMP WHERE id=$1 AND condominio_id=$2`, [regulationId, condominioId, adminId]);
    await client.query(`UPDATE catalogo_articulos_reglamento SET activo=FALSE,actualizado_en=CURRENT_TIMESTAMP WHERE condominio_id=$1`, [condominioId]);
    const articles = await client.query<{codigo:string;titulo:string;descripcion:string;orden:number}>(`
      SELECT a.codigo,a.titulo,COALESCE(string_agg(NULLIF(concat_ws(' ',c.codigo,c.texto),''), E'\n' ORDER BY c.orden),'') descripcion,a.orden
      FROM reglamento_articulos a LEFT JOIN reglamento_clausulas c ON c.articulo_id=a.id
      WHERE a.reglamento_id=$1 GROUP BY a.id ORDER BY a.orden
    `, [regulationId]);
    for (const article of articles.rows) {
      const code = catalogCode(article.codigo);
      const label = `Art. ${article.codigo} - ${article.titulo}`.slice(0, 160);
      await client.query(`
        INSERT INTO catalogo_articulos_reglamento(condominio_id,codigo,nombre,etiqueta,descripcion,activo,orden)
        VALUES($1,$2,$3,$4,$5,TRUE,$6)
        ON CONFLICT (condominio_id,codigo) WHERE condominio_id IS NOT NULL
        DO UPDATE SET nombre=EXCLUDED.nombre,etiqueta=EXCLUDED.etiqueta,descripcion=EXCLUDED.descripcion,
          activo=TRUE,orden=EXCLUDED.orden,actualizado_en=CURRENT_TIMESTAMP
      `, [condominioId, code, article.titulo, label, article.descripcion, article.orden]);
    }
    await client.query('COMMIT');
    return getRegulation(regulationId, condominioId);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function deleteRegulationDraft(regulationId: string, condominioId: string) {
  return (await pool.query(`DELETE FROM reglamentos WHERE id=$1 AND condominio_id=$2 AND estatus='BORRADOR' RETURNING id`, [regulationId, condominioId])).rows[0] || null;
}

export async function formatCurrentRegulation(condominioId: string) {
  const result = await pool.query<{nombre:string;version:number;codigo:string;titulo:string;clausulas:string}>(`
    SELECT r.nombre,r.version,a.codigo,a.titulo,
      COALESCE(string_agg(concat('• ',NULLIF(c.codigo || ' ', ' '),c.texto), E'\n' ORDER BY c.orden),'') clausulas
    FROM reglamentos r JOIN reglamento_articulos a ON a.reglamento_id=r.id
    LEFT JOIN reglamento_clausulas c ON c.articulo_id=a.id
    WHERE r.condominio_id=$1 AND r.estatus='VIGENTE'
    GROUP BY r.id,a.id ORDER BY a.orden
  `, [condominioId]);
  if (!result.rows.length) return null;
  const current = result.rows[0]!;
  const header = `📘 *${current.nombre}* · Versión ${current.version}`;
  const body = result.rows.map((item) => `\n*Art. ${item.codigo} — ${item.titulo}*${item.clausulas ? `\n${item.clausulas}` : ''}`).join('\n');
  return `${header}\n${body}`.slice(0, 3900);
}

export async function getCurrentRule(condominioId: string, code: string) {
  const result = await pool.query<{codigo:string;titulo:string;texto:string}>(`
    SELECT a.codigo,a.titulo,COALESCE(string_agg(concat_ws(' ',c.codigo,c.texto), ' ' ORDER BY c.orden),'') texto
    FROM reglamentos r JOIN reglamento_articulos a ON a.reglamento_id=r.id
    LEFT JOIN reglamento_clausulas c ON c.articulo_id=a.id
    WHERE r.condominio_id=$1 AND r.estatus='VIGENTE' AND a.codigo=$2
    GROUP BY a.id LIMIT 1
  `, [condominioId, code]);
  return result.rows[0] || null;
}
