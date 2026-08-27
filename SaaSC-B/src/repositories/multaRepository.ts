import { pool } from '../db/index.js';
import { getFileAccessUrl } from '../services/storageService.js';

export async function getAllMultas(condominioId: string) {
  const query = `
    SELECT 
      m.id,
      m.motivo,
      m.articulo_reglamento,
      m.monto,
      m.evidencia_url,
      m.estatus,
      m.creado_en,
      m.depto_id,
      d.numero_depto
    FROM multas m
    JOIN departamentos d ON m.depto_id = d.id
    WHERE d.condominio_id = $1
    ORDER BY m.creado_en DESC;
  `;
  const result = await pool.query(query, [condominioId]);
  return Promise.all(result.rows.map(async (row) => ({ ...row, evidencia_url: await getFileAccessUrl(row.evidencia_url) })));
}

export async function getMultasByDepto(deptoId: string) {
  const query = `
    SELECT * FROM multas WHERE depto_id = $1 AND estatus = 'PENDIENTE' ORDER BY creado_en DESC;
  `;
  const result = await pool.query(query, [deptoId]);
  return result.rows;
}

export async function createMulta(motivo: string, articulo_reglamento: string, monto: number, evidencia_url: string | null, depto_id: string, condominioId: string) {
  const query = `
    INSERT INTO multas (motivo, articulo_reglamento, monto, evidencia_url, depto_id)
    SELECT $1, $2, $3, $4, d.id FROM departamentos d WHERE d.id=$5 AND d.condominio_id=$6
    RETURNING *;
  `;
  const result = await pool.query(query, [motivo, articulo_reglamento, monto, evidencia_url, depto_id, condominioId]);
  return result.rows[0];
}

export async function marcarMultaPagada(id: string, condominioId: string) {
  const query = `
    UPDATE multas
    SET estatus = 'PAGADA'
    WHERE id = $1 AND depto_id IN (SELECT id FROM departamentos WHERE condominio_id=$2)
    RETURNING *;
  `;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}
