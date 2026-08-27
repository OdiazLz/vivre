import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getAllEventos, createEvento, deleteEvento, getEventosHoy, updateEvento, cancelEvento, getEventParkingOptions } from '../repositories/eventoRepository.js';

function validateEventInput(body: Record<string, unknown>) {
  const titulo = String(body.titulo || '').trim();
  const fecha_evento = String(body.fecha_evento || '');
  const hora_inicio = String(body.hora_inicio || '');
  const hora_fin = String(body.hora_fin || '');
  const cajones_requeridos = Number(body.cajones_requeridos ?? 0);
  const cajon_ids = body.cajon_ids === undefined ? undefined : Array.isArray(body.cajon_ids) ? [...new Set(body.cajon_ids.filter((id): id is string => typeof id === 'string'))] : null;
  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(fecha_evento) && !Number.isNaN(Date.parse(`${fecha_evento}T00:00:00`));
  const timeIsValid = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if (titulo.length < 3 || titulo.length > 150 || !dateIsValid || !timeIsValid(hora_inicio) || !timeIsValid(hora_fin) || hora_fin <= hora_inicio || !Number.isInteger(cajones_requeridos) || cajones_requeridos < 0 || cajones_requeridos > 20 || cajon_ids === null || (cajon_ids && (cajon_ids.length > cajones_requeridos || cajon_ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))))) return null;
  return { titulo, fecha_evento, hora_inicio, hora_fin, cajones_requeridos, ...(cajon_ids ? { cajon_ids } : {}) };
}

export async function getEventosHandler(req: AuthRequest, res: Response) {
  try {
    const eventos = await getAllEventos(req.user!.condominio_id);
    return res.status(200).json(eventos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createEventoHandler(req: AuthRequest, res: Response) {
  try {
    const { titulo, fecha_evento, hora_inicio, hora_fin, depto_id, usuario_id, cajones_requeridos, cajon_ids } = req.body;

    if (!titulo || !fecha_evento || !hora_inicio || !depto_id || !usuario_id) {
      return res.status(400).json({ error: 'Título, fecha_evento, hora_inicio, depto_id y usuario_id son obligatorios.' });
    }

    const validated = validateEventInput({ titulo, fecha_evento, hora_inicio, hora_fin: hora_fin || '23:59', cajones_requeridos, cajon_ids });
    if (!validated) {
      return res.status(400).json({ error: 'Fecha u horario inválido.' });
    }

    const nuevoEvento = await createEvento(validated.titulo, validated.fecha_evento, validated.hora_inicio, validated.hora_fin, depto_id, usuario_id, req.user!.condominio_id, validated.cajones_requeridos, validated.cajon_ids || []);
    if (!nuevoEvento) return res.status(400).json({ error: 'El residente y departamento no pertenecen a este condominio.' });
    return res.status(201).json(nuevoEvento);
  } catch (error: any) {
    return res.status(/cajón|cajones/i.test(error.message) ? 409 : 500).json({ error: error.message });
  }
}

export async function updateEventoHandler(req: AuthRequest, res: Response) {
  try {
    const data = validateEventInput(req.body);
    if (!data) return res.status(400).json({ error: 'Título, fecha y horario válidos son obligatorios; la hora final debe ser posterior a la inicial.' });
    const event = await updateEvento(req.params.id as string, req.user!.condominio_id, data);
    if (!event) return res.status(404).json({ error: 'Evento activo no encontrado.' });
    return res.json({ message: 'Evento actualizado.', evento: event });
  } catch (error: any) { return res.status(/cajón|cajones/i.test(error.message) ? 409 : 500).json({ error: error.message }); }
}

export async function cancelEventoHandler(req: AuthRequest, res: Response) {
  try {
    const event = await cancelEvento(req.params.id as string, req.user!.condominio_id);
    if (!event) return res.status(404).json({ error: 'Evento activo no encontrado.' });
    return res.json({ message: 'Evento cancelado; se conservó en el historial.', evento: event });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getEventParkingOptionsHandler(req: AuthRequest, res: Response) {
  try {
    const date = String(req.query.fecha || '');
    const start = String(req.query.inicio || '');
    const end = String(req.query.fin || '');
    const eventId = req.query.evento_id ? String(req.query.evento_id) : undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start || (eventId && !/^[0-9a-f-]{36}$/i.test(eventId))) return res.status(400).json({ error: 'Fecha y horario válidos son obligatorios.' });
    return res.json(await getEventParkingOptions(req.user!.condominio_id, date, start, end, eventId));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function deleteEventoHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await deleteEvento(id as string, req.user!.condominio_id);

    if (!deleted) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    return res.status(200).json({ message: 'Evento eliminado correctamente.', evento: deleted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
