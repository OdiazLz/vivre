import { pool } from '../db/index.js';

export interface AssemblyQuestionInput { pregunta: string; opciones: string[] }
export interface CreateAssemblyInput {
  titulo: string; descripcion?: string; modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  ubicacion?: string; enlace_virtual?: string; inicia_en: string; cierra_en: string;
  tipo_voto: 'POR_DEPARTAMENTO' | 'POR_RESIDENTE'; quorum_requerido: number;
  preguntas: AssemblyQuestionInput[];
}

export async function getAssemblies(condominioId: string) {
  const result = await pool.query(`
    SELECT a.*,COUNT(DISTINCT p.id)::int preguntas_total,COUNT(DISTINCT v.id)::int votos_emitidos
    FROM asambleas a LEFT JOIN preguntas_asamblea p ON p.asamblea_id=a.id LEFT JOIN votos_asamblea v ON v.pregunta_id=p.id
    WHERE a.condominio_id=$1 GROUP BY a.id ORDER BY a.inicia_en DESC
  `, [condominioId]);
  return result.rows;
}

export async function getAssemblyDetail(id: string, condominioId: string) {
  const assemblyResult = await pool.query(`SELECT * FROM asambleas WHERE id=$1 AND condominio_id=$2`, [id, condominioId]);
  const assembly = assemblyResult.rows[0];
  if (!assembly) return null;
  const questions = await pool.query(`
    SELECT p.id,p.pregunta,p.orden,COALESCE(json_agg(json_build_object('id',o.id,'texto',o.texto,'orden',o.orden,'votos',(SELECT COUNT(*)::int FROM votos_asamblea v WHERE v.opcion_id=o.id)) ORDER BY o.orden) FILTER(WHERE o.id IS NOT NULL),'[]'::json) opciones
    FROM preguntas_asamblea p LEFT JOIN opciones_votacion o ON o.pregunta_id=p.id
    WHERE p.asamblea_id=$1 GROUP BY p.id ORDER BY p.orden
  `, [id]);
  const eligible = assembly.tipo_voto === 'POR_DEPARTAMENTO'
    ? await pool.query(`SELECT COUNT(*)::int total FROM departamentos WHERE condominio_id=$1`, [condominioId])
    : await pool.query(`SELECT COUNT(DISTINCT u.id)::int total FROM usuarios u JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id WHERE d.condominio_id=$1 AND u.activo=true`, [condominioId]);
  const participation = await pool.query(`SELECT COUNT(DISTINCT ${assembly.tipo_voto === 'POR_DEPARTAMENTO' ? 'v.depto_id' : 'v.usuario_id'})::int total FROM votos_asamblea v JOIN preguntas_asamblea p ON p.id=v.pregunta_id WHERE p.asamblea_id=$1`, [id]);
  const total = Number(eligible.rows[0]?.total || 0);
  const participants = Number(participation.rows[0]?.total || 0);
  return { ...assembly, preguntas: questions.rows, elegibles: total, participantes: participants, participacion_porcentaje: total ? Number(((participants / total) * 100).toFixed(2)) : 0 };
}

export async function createAssembly(condominioId: string, adminId: string, input: CreateAssemblyInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO asambleas(condominio_id,titulo,descripcion,modalidad,ubicacion,enlace_virtual,inicia_en,cierra_en,tipo_voto,quorum_requerido,creado_por)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [condominioId,input.titulo,input.descripcion||null,input.modalidad,input.ubicacion||null,input.enlace_virtual||null,input.inicia_en,input.cierra_en,input.tipo_voto,input.quorum_requerido,adminId]);
    for (let questionIndex = 0; questionIndex < input.preguntas.length; questionIndex++) {
      const question = input.preguntas[questionIndex]!;
      const questionResult = await client.query(`INSERT INTO preguntas_asamblea(asamblea_id,pregunta,orden) VALUES($1,$2,$3) RETURNING id`, [result.rows[0].id,question.pregunta,questionIndex+1]);
      for (let optionIndex = 0; optionIndex < question.opciones.length; optionIndex++) await client.query(`INSERT INTO opciones_votacion(pregunta_id,texto,orden) VALUES($1,$2,$3)`, [questionResult.rows[0].id,question.opciones[optionIndex],optionIndex+1]);
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function updateAssemblyStatus(id: string, condominioId: string, status: 'ABIERTA' | 'CERRADA' | 'CANCELADA') {
  const allowedFrom: Record<string, string[]> = { ABIERTA: ['BORRADOR'], CERRADA: ['ABIERTA'], CANCELADA: ['BORRADOR','ABIERTA'] };
  const result = await pool.query(`UPDATE asambleas SET estatus=$1,actualizado_en=NOW() WHERE id=$2 AND condominio_id=$3 AND estatus=ANY($4::varchar[]) RETURNING *`, [status,id,condominioId,allowedFrom[status]]);
  return result.rows[0] || null;
}

export async function getOpenAssemblies(condominioId: string) {
  const result = await pool.query(`SELECT id,titulo,descripcion,modalidad,ubicacion,enlace_virtual,inicia_en,cierra_en,tipo_voto FROM asambleas WHERE condominio_id=$1 AND estatus='ABIERTA' AND NOW() BETWEEN inicia_en AND cierra_en ORDER BY cierra_en`, [condominioId]);
  return Promise.all(result.rows.map(async (assembly) => {
    const questions = await pool.query(`SELECT p.id,p.pregunta,p.orden,json_agg(json_build_object('id',o.id,'texto',o.texto,'orden',o.orden) ORDER BY o.orden) opciones FROM preguntas_asamblea p JOIN opciones_votacion o ON o.pregunta_id=p.id WHERE p.asamblea_id=$1 GROUP BY p.id ORDER BY p.orden`, [assembly.id]);
    return { ...assembly, preguntas: questions.rows };
  }));
}

export async function castAssemblyVotes(reference: string, condominioId: string, usuarioId: string, deptoId: string, selections: Array<{ pregunta: number; opcion: number }>) {
  if (!/^[0-9a-f-]{6,36}$/i.test(reference)) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assemblyResult = await client.query(`SELECT * FROM asambleas WHERE id::text LIKE $1 AND condominio_id=$2 AND estatus='ABIERTA' AND NOW() BETWEEN inicia_en AND cierra_en FOR UPDATE`, [`${reference.toLowerCase()}%`,condominioId]);
    if (assemblyResult.rows.length !== 1) { await client.query('ROLLBACK'); return null; }
    const assembly = assemblyResult.rows[0];
    const questions = await client.query(`SELECT p.id,p.orden,o.id opcion_id,o.orden opcion_orden FROM preguntas_asamblea p JOIN opciones_votacion o ON o.pregunta_id=p.id WHERE p.asamblea_id=$1`, [assembly.id]);
    for (const selection of selections) {
      const selected = questions.rows.find((row) => row.orden === selection.pregunta && row.opcion_orden === selection.opcion);
      if (!selected) throw new Error(`La selección ${selection.pregunta}:${selection.opcion} no existe.`);
      if (assembly.tipo_voto === 'POR_DEPARTAMENTO') await client.query(`DELETE FROM votos_asamblea WHERE pregunta_id=$1 AND depto_id=$2`, [selected.id,deptoId]);
      else await client.query(`DELETE FROM votos_asamblea WHERE pregunta_id=$1 AND usuario_id=$2 AND depto_id IS NULL`, [selected.id,usuarioId]);
      await client.query(`INSERT INTO votos_asamblea(pregunta_id,opcion_id,usuario_id,depto_id,canal) VALUES($1,$2,$3,$4,'WHATSAPP')`, [selected.id,selected.opcion_id,usuarioId,assembly.tipo_voto === 'POR_DEPARTAMENTO' ? deptoId : null]);
    }
    await client.query('COMMIT');
    return { asamblea: assembly, votos: selections.length };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
