import { pool } from '../db/index.js';

export type CondominioStatus = 'ACTIVO' | 'SUSPENDIDO';

export async function getCondominioStatus(condominioId: string): Promise<CondominioStatus | null> {
  const result = await pool.query(`SELECT estatus FROM condominios WHERE id=$1`, [condominioId]);
  return result.rows[0]?.estatus || null;
}

export async function listLicensedCondominiums() {
  const result = await pool.query(`
    SELECT c.id,c.nombre,c.estatus,c.creado_en,
      principal.email administrador_email,principal.nombre administrador_nombre,
      COUNT(DISTINCT d.id)::int total_departamentos,
      COUNT(DISTINCT du.usuario_id)::int total_residentes
    FROM condominios c
    LEFT JOIN departamentos d ON d.condominio_id=c.id
    LEFT JOIN depto_usuarios du ON du.depto_id=d.id
    LEFT JOIN LATERAL (
      SELECT a.email,a.nombre,a.rol FROM administradores a
      WHERE a.condominio_id=c.id AND a.rol IN ('ADMINISTRADOR','PRESIDENTE') AND a.activo=true
      ORDER BY (a.rol='ADMINISTRADOR') DESC,a.creado_en LIMIT 1
    ) principal ON true
    GROUP BY c.id,principal.email,principal.nombre
    ORDER BY c.nombre
  `);
  return result.rows;
}

export async function updateCondominioStatus(id: string, status: CondominioStatus) {
  const result = await pool.query(`UPDATE condominios SET estatus=$1 WHERE id=$2 RETURNING id,nombre,estatus`, [status,id]);
  return result.rows[0] || null;
}
