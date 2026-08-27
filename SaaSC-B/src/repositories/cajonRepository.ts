import { pool } from '../db/index.js';

export async function repairOrphanCajones(condominioId: string) {
  await pool.query(`
    UPDATE cajones_estacionamiento
    SET condominio_id = $1
    WHERE condominio_id IS NULL
      AND (SELECT COUNT(*) FROM condominios) = 1;
  `, [condominioId]);
}

export async function getAllCajones(condominioId: string) {
  await repairOrphanCajones(condominioId);
  const result = await pool.query(`
    SELECT * FROM cajones_estacionamiento
    WHERE condominio_id = $1
    ORDER BY codigo_cajon ASC;
  `, [condominioId]);
  return result.rows;
}

export async function getParkingMonitor(condominioId: string) {
  await repairOrphanCajones(condominioId);
  const result = await pool.query(`
    SELECT
      c.id,
      c.codigo_cajon,
      c.tipo,
      c.estatus,
      c.creado_en,
      r.id AS reserva_id,
      v.id AS visita_id,
      COALESCE(r.nombre_visitante, v.nombre_visitante) AS visitante_nombre,
      COALESCE(r.placas_auto, v.placas_auto) AS placas,
      COALESCE(r.fecha_inicio, v.fecha_entrada) AS hora_entrada,
      COALESCE(d.numero_depto, dv.numero_depto) AS depto_reserva,
      EXTRACT(EPOCH FROM (NOW() - COALESCE(r.fecha_inicio, v.fecha_entrada))) / 60 AS minutos_transcurridos,
      ev.evento_id,
      ev.evento_titulo,
      ev.evento_fecha,
      ev.evento_inicio,
      ev.evento_fin,
      ev.evento_depto
    FROM cajones_estacionamiento c
    LEFT JOIN reservas_cajones r ON r.cajon_id = c.id AND r.estatus = 'ACTIVA'
    LEFT JOIN departamentos d ON d.id = r.depto_id
    LEFT JOIN visitas v ON v.cajon_asignado = c.codigo_cajon AND v.estatus = 'ACTIVA'
    LEFT JOIN departamentos dv ON dv.id = v.depto_id
    LEFT JOIN LATERAL (
      SELECT e.id evento_id,e.titulo evento_titulo,e.fecha_evento evento_fecha,e.hora_inicio evento_inicio,e.hora_fin evento_fin,de.numero_depto evento_depto
      FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id JOIN departamentos de ON de.id=e.depto_id
      WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento>=CURRENT_DATE
      ORDER BY e.fecha_evento,e.hora_inicio LIMIT 1
    ) ev ON true
    WHERE c.condominio_id = $1
    ORDER BY c.codigo_cajon ASC;
  `, [condominioId]);
  return result.rows;
}

export async function getCajonesDisponibles(deptoId: string) {
  const query = `
    SELECT c.*
    FROM cajones_estacionamiento c
    JOIN departamentos d ON d.condominio_id = c.condominio_id
    WHERE d.id = $1 AND c.estatus = 'DISPONIBLE'
      AND NOT EXISTS(SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=CURRENT_DATE AND CURRENT_TIME>=e.hora_inicio AND CURRENT_TIME<e.hora_fin)
    ORDER BY c.codigo_cajon ASC;
  `;
  const result = await pool.query(query, [deptoId]);
  return result.rows;
}

export async function getCajonById(id: string) {
  const query = `SELECT * FROM cajones_estacionamiento WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

export async function getCajonByCodigo(codigo: string, deptoId: string) {
  const query = `
    SELECT c.*
    FROM cajones_estacionamiento c
    JOIN departamentos d ON d.condominio_id = c.condominio_id
    WHERE c.codigo_cajon = $1 AND d.id = $2
      AND NOT EXISTS(SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=CURRENT_DATE AND CURRENT_TIME>=e.hora_inicio AND CURRENT_TIME<e.hora_fin);
  `;
  const result = await pool.query(query, [codigo, deptoId]);
  return result.rows[0];
}

export async function createCajon(codigo_cajon: string, tipo: string, condominio_id: string) {
  const query = `
    INSERT INTO cajones_estacionamiento (codigo_cajon, tipo, estatus, condominio_id)
    VALUES ($1, $2, 'DISPONIBLE', $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [codigo_cajon, tipo, condominio_id]);
  return result.rows[0];
}

export async function updateCajonEstatus(id: string, estatus: 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO', condominioId: string) {
  const query = `
    UPDATE cajones_estacionamiento
    SET estatus = $1
    WHERE id = $2 AND condominio_id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [estatus, id, condominioId]);
  return result.rows[0];
}

export async function deleteCajon(id: string, condominioId: string) {
  const query = `DELETE FROM cajones_estacionamiento WHERE id = $1 AND condominio_id = $2 RETURNING *;`;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}

// Reservas
export async function getReservasActivas(condominioId: string) {
  const query = `
    SELECT 
      r.id,
      r.placas_auto,
      r.nombre_visitante,
      r.fecha_inicio,
      r.cajon_id,
      c.codigo_cajon,
      u.nombre as usuario_nombre,
      d.numero_depto,
      EXTRACT(EPOCH FROM (NOW() - r.fecha_inicio)) / 60 as minutos_transcurridos
    FROM reservas_cajones r
    JOIN cajones_estacionamiento c ON r.cajon_id = c.id
    JOIN usuarios u ON r.usuario_id = u.id
    JOIN departamentos d ON r.depto_id = d.id
    WHERE r.estatus = 'ACTIVA' AND c.condominio_id = $1
    ORDER BY r.fecha_inicio DESC;
  `;
  const result = await pool.query(query, [condominioId]);
  return result.rows;
}

export async function createReserva(cajon_id: string, usuario_id: string, depto_id: string, placas_auto: string, nombre_visitante: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verificar si el cajón está disponible
    const cajonCheck = await client.query(`
      SELECT c.estatus
      FROM cajones_estacionamiento c
      JOIN departamentos d ON d.condominio_id = c.condominio_id
      WHERE c.id = $1 AND d.id = $2
        AND NOT EXISTS(SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=CURRENT_DATE AND CURRENT_TIME>=e.hora_inicio AND CURRENT_TIME<e.hora_fin)
      FOR UPDATE OF c
    `, [cajon_id, depto_id]);
    
    if (!cajonCheck.rows[0] || cajonCheck.rows[0].estatus !== 'DISPONIBLE') {
      await client.query('ROLLBACK');
      return null;
    }
    
    // Actualizar estatus del cajón
    await client.query(
      'UPDATE cajones_estacionamiento SET estatus = $1 WHERE id = $2',
      ['OCUPADO', cajon_id]
    );
    
    // Crear reserva
    const query = `
      INSERT INTO reservas_cajones (cajon_id, depto_id, usuario_id, placas_auto, nombre_visitante, fecha_inicio, estatus)
      VALUES ($1, $2, $3, $4, $5, NOW(), 'ACTIVA')
      RETURNING *;
    `;
    const result = await client.query(query, [cajon_id, depto_id, usuario_id, placas_auto, nombre_visitante]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function liberarReserva(reserva_id: string, condominioId?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtener la reserva
    const reservaQuery = `
      SELECT r.* FROM reservas_cajones r
      JOIN cajones_estacionamiento c ON c.id = r.cajon_id
      WHERE r.id = $1 AND r.estatus = 'ACTIVA'
        AND ($2::uuid IS NULL OR c.condominio_id = $2)
      FOR UPDATE OF r;
    `;
    const reservaResult = await client.query(reservaQuery, [reserva_id, condominioId || null]);
    
    if (!reservaResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    
    const reserva = reservaResult.rows[0];
    
    // Finalizar reserva
    await client.query(
      'UPDATE reservas_cajones SET estatus = $1, fecha_fin = NOW() WHERE id = $2',
      ['FINALIZADA', reserva_id]
    );
    
    // Liberar cajón
    await client.query(
      'UPDATE cajones_estacionamiento SET estatus = $1 WHERE id = $2',
      ['DISPONIBLE', reserva.cajon_id]
    );
    
    await client.query('COMMIT');
    return reserva;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getReservaActivaByUsuario(usuario_id: string) {
  const query = `
    SELECT r.*, c.codigo_cajon
    FROM reservas_cajones r
    JOIN cajones_estacionamiento c ON r.cajon_id = c.id
    WHERE r.usuario_id = $1 AND r.estatus = 'ACTIVA'
    LIMIT 1;
  `;
  const result = await pool.query(query, [usuario_id]);
  return result.rows[0];
}
