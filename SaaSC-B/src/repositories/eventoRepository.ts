import { pool } from '../db/index.js';

export async function getAllEventos(condominioId: string) {
  const query = `
    SELECT 
      e.id,
      e.titulo,
      e.fecha_evento,
      e.hora_inicio,
      e.hora_fin,
      e.estatus,
      e.notificacion_enviada,
      e.actualizado_en,
      e.cancelado_en,
      e.origen_cancelacion,
      e.cajones_requeridos,
      COALESCE((SELECT json_agg(json_build_object('id',c.id,'codigo_cajon',c.codigo_cajon) ORDER BY c.codigo_cajon) FROM evento_cajones ec JOIN cajones_estacionamiento c ON c.id=ec.cajon_id WHERE ec.evento_id=e.id),'[]'::json) AS cajones_asignados,
      e.usuario_id,
      e.depto_id,
      d.condominio_id,
      u.nombre as usuario_nombre,
      u.telefono_whatsapp,
      d.numero_depto
    FROM eventos e
    JOIN usuarios u ON e.usuario_id = u.id
    JOIN departamentos d ON e.depto_id = d.id
    WHERE d.condominio_id=$1
    ORDER BY e.fecha_evento ASC, e.hora_inicio ASC;
  `;
  const result = await pool.query(query, [condominioId]);
  return result.rows;
}

export async function getEventosHoy() {
  const query = `
    SELECT 
      e.id,
      e.titulo,
      e.fecha_evento,
      e.hora_inicio,
      e.hora_fin,
      e.usuario_id,
      e.depto_id,
      u.nombre as usuario_nombre,
      u.telefono_whatsapp,
      d.numero_depto
    FROM eventos e
    JOIN usuarios u ON e.usuario_id = u.id
    JOIN departamentos d ON e.depto_id = d.id
    JOIN condominios c ON c.id=d.condominio_id AND c.estatus='ACTIVO'
    WHERE e.fecha_evento = CURRENT_DATE AND e.estatus = 'APROBADO'
    ORDER BY e.hora_inicio ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function createEvento(titulo: string, fecha_evento: string, hora_inicio: string, hora_fin: string, depto_id: string, usuario_id: string, condominioId: string, cajonesRequeridos = 0, cajonIds: string[] = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO eventos (titulo,fecha_evento,hora_inicio,hora_fin,depto_id,usuario_id,estatus,cajones_requeridos)
      SELECT $1,$2,$3,$4,$5,$6,'APROBADO',$8 FROM departamentos d
      WHERE d.id=$5 AND d.condominio_id=$7 AND EXISTS(SELECT 1 FROM depto_usuarios du WHERE du.depto_id=d.id AND du.usuario_id=$6)
      RETURNING *
    `, [titulo, fecha_evento, hora_inicio, hora_fin, depto_id, usuario_id, condominioId, cajonesRequeridos]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await syncEventParking(client, result.rows[0].id, condominioId, fecha_evento, hora_inicio, hora_fin, cajonesRequeridos, cajonIds);
    await client.query('COMMIT');
    return { ...result.rows[0], cajones_asignados: cajonIds };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function deleteEvento(id: string, condominioId: string) {
  const query = `DELETE FROM eventos e WHERE e.id=$1 AND EXISTS (SELECT 1 FROM departamentos d WHERE d.id=e.depto_id AND d.condominio_id=$2) RETURNING e.*;`;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}

export interface EventUpdateInput { titulo: string; fecha_evento: string; hora_inicio: string; hora_fin: string; cajones_requeridos?: number; cajon_ids?: string[] }

async function syncEventParking(client: import('pg').PoolClient, eventId: string, condominioId: string, date: string, start: string, end: string, requested: number, requestedIds?: string[]) {
  const currentResult = await client.query(`SELECT cajon_id FROM evento_cajones WHERE evento_id=$1`, [eventId]);
  const ids = requestedIds ?? currentResult.rows.map((row) => row.cajon_id as string);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length !== ids.length) throw new Error('No puedes asignar el mismo cajón más de una vez.');
  if (uniqueIds.length > requested) throw new Error('Los cajones asignados no pueden superar los cajones solicitados.');
  if (uniqueIds.length) {
    const valid = await client.query(`SELECT id FROM cajones_estacionamiento WHERE id=ANY($1::uuid[]) AND condominio_id=$2 AND tipo='VISITA' AND estatus<>'MANTENIMIENTO' FOR UPDATE`, [uniqueIds, condominioId]);
    if (valid.rowCount !== uniqueIds.length) throw new Error('Uno o más cajones no son espacios de visita disponibles para este condominio.');
    const conflict = await client.query(`
      SELECT c.codigo_cajon FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id JOIN cajones_estacionamiento c ON c.id=ec.cajon_id
      WHERE ec.cajon_id=ANY($1::uuid[]) AND e.id<>$2 AND e.estatus='APROBADO' AND e.fecha_evento=$3
        AND e.hora_inicio<$5::time AND e.hora_fin>$4::time LIMIT 1
    `, [uniqueIds, eventId, date, start, end]);
    if (conflict.rows[0]) throw new Error(`El cajón ${conflict.rows[0].codigo_cajon} ya está asignado a otro evento en ese horario.`);
  }
  await client.query('DELETE FROM evento_cajones WHERE evento_id=$1', [eventId]);
  for (const cajonId of uniqueIds) await client.query('INSERT INTO evento_cajones(evento_id,cajon_id) VALUES($1,$2)', [eventId, cajonId]);
}

export async function updateEvento(id: string, condominioId: string, data: EventUpdateInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE eventos e SET titulo=$1,fecha_evento=$2,hora_inicio=$3,hora_fin=$4,cajones_requeridos=COALESCE($5,cajones_requeridos),
        notificacion_enviada=false,actualizado_en=NOW()
      WHERE e.id=$6 AND e.estatus='APROBADO' AND EXISTS(SELECT 1 FROM departamentos d WHERE d.id=e.depto_id AND d.condominio_id=$7)
      RETURNING e.*
    `, [data.titulo, data.fecha_evento, data.hora_inicio, data.hora_fin, data.cajones_requeridos, id, condominioId]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await syncEventParking(client, id, condominioId, data.fecha_evento, data.hora_inicio, data.hora_fin, Number(result.rows[0].cajones_requeridos), data.cajon_ids);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function cancelEvento(id: string, condominioId: string, origin = 'DASHBOARD') {
  const result = await pool.query(`
    UPDATE eventos e SET estatus='CANCELADO',cancelado_en=NOW(),origen_cancelacion=$1,actualizado_en=NOW()
    WHERE e.id=$2 AND e.estatus='APROBADO'
      AND EXISTS(SELECT 1 FROM departamentos d WHERE d.id=e.depto_id AND d.condominio_id=$3)
    RETURNING e.*
  `, [origin, id, condominioId]);
  return result.rows[0] || null;
}

export async function getUpcomingEventsByUser(usuarioId: string, condominioId: string) {
  const result = await pool.query(`
    SELECT e.id,e.titulo,e.fecha_evento,e.hora_inicio,e.hora_fin,e.cajones_requeridos,d.numero_depto,
      COALESCE((SELECT string_agg(c.codigo_cajon,', ' ORDER BY c.codigo_cajon) FROM evento_cajones ec JOIN cajones_estacionamiento c ON c.id=ec.cajon_id WHERE ec.evento_id=e.id),'Sin asignar') cajones_asignados
    FROM eventos e JOIN departamentos d ON d.id=e.depto_id
    WHERE e.usuario_id=$1 AND d.condominio_id=$2 AND e.estatus='APROBADO' AND e.fecha_evento>=CURRENT_DATE
    ORDER BY e.fecha_evento,e.hora_inicio LIMIT 10
  `, [usuarioId, condominioId]);
  return result.rows;
}

async function resolveOwnedEvent(reference: string, usuarioId: string, condominioId: string) {
  if (!/^[0-9a-f-]{6,36}$/i.test(reference)) return null;
  const result = await pool.query(`
    SELECT e.id FROM eventos e JOIN departamentos d ON d.id=e.depto_id
    WHERE e.id::text LIKE $1 AND e.usuario_id=$2 AND d.condominio_id=$3
      AND e.estatus='APROBADO' AND e.fecha_evento>=CURRENT_DATE
    ORDER BY e.fecha_evento LIMIT 2
  `, [`${reference.toLowerCase()}%`, usuarioId, condominioId]);
  return result.rows.length === 1 ? result.rows[0].id as string : null;
}

export async function cancelEventoByUser(reference: string, usuarioId: string, condominioId: string) {
  const id = await resolveOwnedEvent(reference, usuarioId, condominioId);
  return id ? cancelEvento(id, condominioId, 'WHATSAPP') : null;
}

export async function updateEventoByUser(reference: string, usuarioId: string, condominioId: string, data: EventUpdateInput) {
  const id = await resolveOwnedEvent(reference, usuarioId, condominioId);
  return id ? updateEvento(id, condominioId, data) : null;
}

export async function getEventParkingOptions(condominioId: string, date: string, start: string, end: string, eventId?: string) {
  const result = await pool.query(`
    SELECT c.id,c.codigo_cajon,c.estatus,
      NOT EXISTS(
        SELECT 1 FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id
        WHERE ec.cajon_id=c.id AND e.estatus='APROBADO' AND e.fecha_evento=$2
          AND e.hora_inicio<$4::time AND e.hora_fin>$3::time AND ($5::uuid IS NULL OR e.id<>$5)
      ) AS disponible
    FROM cajones_estacionamiento c
    WHERE c.condominio_id=$1 AND c.tipo='VISITA' AND c.estatus<>'MANTENIMIENTO'
    ORDER BY c.codigo_cajon
  `, [condominioId, date, start, end, eventId || null]);
  return result.rows;
}
