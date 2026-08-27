import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { approveRegistrationRequest, createInvitationCode, deactivateInvitationCode, listInvitationCodes, listRegistrationRequests, rejectRegistrationRequest } from '../repositories/registrationRepository.js';
import { config } from '../config/index.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';

function invitationResponse(invitation: any) {
  const message = `ALTA ${invitation.codigo}`;
  const publicNumber = config.whatsapp.publicNumber.replace(/\D/g, '');
  return { ...invitation, mensaje_whatsapp: message, wa_link: publicNumber ? `https://wa.me/${publicNumber}?text=${encodeURIComponent(message)}` : null };
}

export async function createInvitationHandler(req: AuthRequest, res: Response) {
  try {
    const days = Math.min(Math.max(Number(req.body.dias_vigencia) || 30, 1), 365);
    const maxUses = Math.min(Math.max(Number(req.body.max_usos) || 100, 1), 1000);
    const invitation = await createInvitationCode(req.user!.condominio_id, req.user!.admin_id, req.body.descripcion, days, maxUses);
    return res.status(201).json(invitationResponse(invitation));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getInvitationsHandler(req: AuthRequest, res: Response) {
  try { return res.json((await listInvitationCodes(req.user!.condominio_id)).map(invitationResponse)); }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function deactivateInvitationHandler(req: AuthRequest, res: Response) {
  try {
    const invitation = await deactivateInvitationCode(req.params.id as string, req.user!.condominio_id);
    if (!invitation) return res.status(404).json({ error: 'Invitación no encontrada.' });
    return res.json(invitation);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getRegistrationRequestsHandler(req: AuthRequest, res: Response) {
  try {
    const status = typeof req.query.estatus === 'string' && ['PENDIENTE', 'APROBADA', 'RECHAZADA'].includes(req.query.estatus) ? req.query.estatus : undefined;
    return res.json(await listRegistrationRequests(req.user!.condominio_id, status));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function approveRegistrationHandler(req: AuthRequest, res: Response) {
  try {
    const request = await approveRegistrationRequest(req.params.id as string, req.user!.condominio_id, req.user!.admin_id);
    if (!request) return res.status(404).json({ error: 'Solicitud pendiente no encontrada.' });
    void sendMessageWhatssap(request.telefono_whatsapp, `✅ *Registro aprobado*\n\nHola ${request.nombre}. Ya puedes utilizar los servicios de tu privada para el departamento *${request.numero_depto}*.\n\nEscribe *Menú* para comenzar.`).catch(() => undefined);
    return res.json(request);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function rejectRegistrationHandler(req: AuthRequest, res: Response) {
  try {
    const request = await rejectRegistrationRequest(req.params.id as string, req.user!.condominio_id, req.user!.admin_id, req.body.motivo);
    if (!request) return res.status(404).json({ error: 'Solicitud pendiente no encontrada.' });
    void sendMessageWhatssap(request.telefono_whatsapp, `⚠️ *Registro no aprobado*\n\n${req.body.motivo ? `Motivo: ${req.body.motivo}\n\n` : ''}Contacta al comité para revisar tus datos.`).catch(() => undefined);
    return res.json(request);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}
