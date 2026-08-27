import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { createAssembly, getAssemblies, getAssemblyDetail, updateAssemblyStatus, type CreateAssemblyInput } from '../repositories/assemblyRepository.js';
import { getAllActiveUsers } from '../repositories/userRepository.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';

function validateAssembly(body: Record<string, unknown>): CreateAssemblyInput | null {
  const titulo = String(body.titulo || '').trim();
  const descripcion = String(body.descripcion || '').trim();
  const modalidad = body.modalidad;
  const ubicacion = String(body.ubicacion || '').trim();
  const enlace_virtual = String(body.enlace_virtual || '').trim();
  const inicia_en = String(body.inicia_en || '');
  const cierra_en = String(body.cierra_en || '');
  const tipo_voto = body.tipo_voto;
  const quorum_requerido = Number(body.quorum_requerido ?? 50);
  const rawQuestions = Array.isArray(body.preguntas) ? body.preguntas : [];
  if (titulo.length < 3 || titulo.length > 180 || descripcion.length > 3000 || !['PRESENCIAL','VIRTUAL','HIBRIDA'].includes(String(modalidad)) || !['POR_DEPARTAMENTO','POR_RESIDENTE'].includes(String(tipo_voto)) || !Number.isFinite(Date.parse(inicia_en)) || !Number.isFinite(Date.parse(cierra_en)) || new Date(cierra_en) <= new Date(inicia_en) || !Number.isFinite(quorum_requerido) || quorum_requerido < 0 || quorum_requerido > 100 || rawQuestions.length < 1 || rawQuestions.length > 10) return null;
  if (enlace_virtual && !/^https:\/\//i.test(enlace_virtual)) return null;
  if (modalidad === 'PRESENCIAL' && !ubicacion) return null;
  if (modalidad === 'VIRTUAL' && !enlace_virtual) return null;
  if (modalidad === 'HIBRIDA' && (!ubicacion || !enlace_virtual)) return null;
  const preguntas = rawQuestions.map((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return { pregunta: String(record.pregunta || '').trim(), opciones: Array.isArray(record.opciones) ? record.opciones.map((option) => String(option).trim()).filter(Boolean) : [] };
  });
  if (preguntas.some((question) => question.pregunta.length < 5 || question.pregunta.length > 300 || question.opciones.length < 2 || question.opciones.length > 10 || question.opciones.some((option) => option.length > 200) || new Set(question.opciones.map((option) => option.toLocaleLowerCase('es-MX'))).size !== question.opciones.length)) return null;
  return { titulo, descripcion, modalidad: modalidad as CreateAssemblyInput['modalidad'], ubicacion, enlace_virtual, inicia_en, cierra_en, tipo_voto: tipo_voto as CreateAssemblyInput['tipo_voto'], quorum_requerido, preguntas };
}

function internalError(res: Response, error: unknown) {
  console.error('Error en asambleas:', error);
  return res.status(500).json({ error: 'No fue posible procesar la asamblea.' });
}

export async function getAssembliesHandler(req: AuthRequest, res: Response) {
  try { return res.json(await getAssemblies(req.user!.condominio_id)); }
  catch (error) { return internalError(res, error); }
}

export async function getAssemblyDetailHandler(req: AuthRequest, res: Response) {
  try { const result = await getAssemblyDetail(req.params.id as string, req.user!.condominio_id); return result ? res.json(result) : res.status(404).json({ error: 'Asamblea no encontrada.' }); }
  catch (error) { return internalError(res, error); }
}

export async function createAssemblyHandler(req: AuthRequest, res: Response) {
  try { const input = req.body && typeof req.body === 'object' ? validateAssembly(req.body) : null; if (!input) return res.status(400).json({ error: 'Revisa los datos, fechas, preguntas y opciones de la asamblea.' }); return res.status(201).json(await createAssembly(req.user!.condominio_id, req.user!.admin_id, input)); }
  catch (error) { return internalError(res, error); }
}

export async function updateAssemblyStatusHandler(req: AuthRequest, res: Response) {
  try {
    const status = req.body.estatus;
    if (!['ABIERTA','CERRADA','CANCELADA'].includes(status)) return res.status(400).json({ error: 'Estatus inválido.' });
    const result = await updateAssemblyStatus(req.params.id as string, req.user!.condominio_id, status);
    if (!result) return res.status(409).json({ error: 'La transición de estatus no está permitida.' });
    if (status === 'ABIERTA') {
      void getAllActiveUsers(req.user!.condominio_id).then((users) => Promise.allSettled(users.map((user) => sendMessageWhatssap(user.telefono_whatsapp, `🗳️ *Nueva asamblea disponible*\n\n*${result.titulo}*\nCierre: ${new Date(result.cierra_en).toLocaleString('es-MX')}\n\nEscribe *votaciones* para consultar las preguntas y participar.`))));
    }
    return res.json(result);
  } catch (error) { return internalError(res, error); }
}
