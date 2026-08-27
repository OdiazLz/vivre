import { pool } from '../db/index.js';

import { repairOrphanCajones } from './cajonRepository.js';

export async function getAllVisitas(condominioId: string) {
  await repairOrphanCajones(condominioId);
  const query = `
    SELECT
      c.id,
      c.codigo_cajon AS numero,
      c.tipo,
      c.estatus,
      (c.estatus = 'OCUPADO') AS ocupado,
      COALESCE(v.nombre_visitante, r.nombre_visitante) AS visitante_nombre,
      COALESCE(v.placas_auto, r.placas_auto) AS placas,
      COALESCE(dv.numero_depto, dr.numero_depto) AS depto_visita,
      COALESCE(v.fecha_entrada, r.fecha_inicio) AS hora_entrada,
      COALESCE(v.id, r.id) AS registro_id,
      CASE WHEN v.id IS NOT NULL THEN 'VISITA' WHEN r.id IS NOT NULL THEN 'RESERVA' END AS registro_tipo,
      ev.evento_titulo,ev.evento_fecha,ev.evento_inicio,ev.evento_fin,ev.evento_depto
    FROM cajones_estacionamiento c
    LEFT JOIN visitas v ON v.cajon_asignado = c.codigo_cajon AND v.estatus = 'ACTIVA'
    LEFT JOIN departamentos dv ON v.depto_id = dv.id
    LEFT JOIN reservas_cajones r ON r.cajon_id = c.id AND r.estatus = 'ACTIVA'
    LEFT JOIN departamentos dr ON r.depto_id = dr.id
    LEFT JOIN LATERAL (
      SELECT e.titulo evento_titulo,e.fecha_evento evento_fecha,e.hora_inicio evento_inicio,e.hora_fin evento_fin,de.numero_depto evento_depto
      FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id JOIN departamentos de ON de.id=e.depto_id
      WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento>=CURRENT_DATE
      ORDER BY e.fecha_evento,e.hora_inicio LIMIT 1
    ) ev ON true
    WHERE c.condominio_id = $1
    ORDER BY c.codigo_cajon ASC;
  `;
  const result = await pool.query(query, [condominioId]);
  return result.rows;
}

export async function createVisita(nombre_visitante: string, placas_auto: string, depto_id: string, cajon_asignado?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (cajon_asignado) {
      const cajon = await client.query(`
        UPDATE cajones_estacionamiento c
        SET estatus = 'OCUPADO'
        FROM departamentos d
        WHERE c.codigo_cajon = $1
          AND d.id = $2
          AND c.condominio_id = d.condominio_id
          AND c.estatus = 'DISPONIBLE'
          AND NOT EXISTS(SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=CURRENT_DATE AND CURRENT_TIME>=e.hora_inicio AND CURRENT_TIME<e.hora_fin)
        RETURNING c.id;
      `, [cajon_asignado, depto_id]);
      if (!cajon.rows[0]) throw new Error('El cajón no está disponible.');
    }
    const result = await client.query(`
      INSERT INTO visitas (nombre_visitante, placas_auto, depto_id, cajon_asignado, estatus, fecha_entrada)
      VALUES ($1, $2, $3, $4, 'ACTIVA', NOW())
      RETURNING *;
    `, [nombre_visitante, placas_auto || null, depto_id, cajon_asignado || null]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function marcarSalidaVisita(id: string, condominioId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE visitas v
      SET estatus = 'FINALIZADA', fecha_salida = NOW()
      FROM cajones_estacionamiento c
      WHERE v.id = $1 AND v.estatus = 'ACTIVA'
        AND c.codigo_cajon = v.cajon_asignado
        AND c.condominio_id = $2
      RETURNING v.*;
    `, [id, condominioId]);
    const visita = result.rows[0];
    if (visita?.cajon_asignado) {
      await client.query(`
        UPDATE cajones_estacionamiento
        SET estatus = 'DISPONIBLE'
        WHERE codigo_cajon = $1 AND condominio_id = $2;
      `, [visita.cajon_asignado, condominioId]);
    }
    await client.query('COMMIT');
    return visita;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCajonDisponible(deptoId: string) {
  const query = `
    SELECT c.codigo_cajon
    FROM cajones_estacionamiento c
    JOIN departamentos d ON d.condominio_id = c.condominio_id
    WHERE d.id = $1 AND c.tipo = 'VISITA' AND c.estatus = 'DISPONIBLE'
      AND NOT EXISTS(SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=CURRENT_DATE AND CURRENT_TIME>=e.hora_inicio AND CURRENT_TIME<e.hora_fin)
    ORDER BY c.codigo_cajon
    LIMIT 1;
  `;
  const result = await pool.query(query, [deptoId]);
  return result.rows[0]?.codigo_cajon || null;
}
