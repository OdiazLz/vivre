import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getAllIncidencias, updateEstatus, createIncidencia, deleteIncidencia } from '../repositories/incidenciaRepository.js'
import { sendMessageWhatssap } from '../services/whatsappService.js'
import { cleanPhoneNumber } from '../utils/phone.js'

export async function getIncidenciasHandler(req: AuthRequest, res: Response) {
    try {
        const incidencia = await getAllIncidencias(req.user!.condominio_id);
        return res.status(200).json(incidencia);
    } catch (error: any) {
        console.error('Error al obtener incidencias:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}

export async function updateIncidenciaStatusHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { estatus } = req.body;

        if (!['ABIERTO', 'EN_PROCESO', 'RESUELTO'].includes(estatus)) {
            return res.status(400).json({ error: 'Estatus inválido.' });
        }

        const incidencia = await updateEstatus(id as string, estatus, req.user!.condominio_id);

        if (!incidencia) {
            return res.status(404).json({ error: 'Incidencia no encontrada.' });
        }

        if (estatus === 'RESUELTO' && incidencia) {
            const cleanPhone = cleanPhoneNumber(incidencia.telefono_whatsapp);
            const mensaje =
                '✅ *Incidencia Resuelta*\n\n' +
                `Hola ${incidencia.usuario_nombre}, 👋\n\n` +
                `📝 Tu incidencia ha sido resuelta exitosamente.\n\n` +
                `🔍 *Descripción:* ${incidencia.descripcion}\n\n` +
                `📍 Departamento: ${incidencia.numero_depto}\n\n` +
                `🙏 Gracias por reportar y ayudarnos a mejorar el condominio.\n\n` +
                `¿Tienes alguna otra consulta? Contáctanos. 📞`;

            await sendMessageWhatssap(cleanPhone, mensaje);
        }
        return res.status(200).json(incidencia);
    } catch (error: any) {
        console.error('Error al actualizar el estatus de la incidencia:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}

export async function createIncidenciaHandler(req: AuthRequest, res: Response) {
    try {
        const { depto_id, usuario_id, descripcion, foto_url } = req.body;

        if (!depto_id || !usuario_id || !descripcion) {
            return res.status(400).json({ error: 'El departamento, residente y descripción son obligatorios.' });
        }

        const nuevaIncidencia = await createIncidencia(depto_id, usuario_id, descripcion, foto_url, req.user!.condominio_id);
        if (!nuevaIncidencia) return res.status(400).json({ error: 'El residente y departamento no pertenecen a este condominio.' });
        return res.status(201).json(nuevaIncidencia);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

export async function deleteIncidenciaHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const deleted = await deleteIncidencia(id as string, req.user!.condominio_id);

        if (!deleted) {
            return res.status(404).json({ error: 'Incidencia no encontrada.' });
        }

        return res.status(200).json({ message: 'Incidencia eliminada correctamente.', incidencia: deleted });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
