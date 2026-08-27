// src/controllers/broadcastController.ts
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { BroadcastService } from '../services/broadcastService.js';
import { getFileAccessUrl, isFileKeyOwnedByCondominium } from '../services/storageService.js';
import { deleteBroadcast, listBroadcasts } from '../repositories/broadcastRepository.js';

const broadcastService = new BroadcastService();

export async function sendBroadcastHandler(req: AuthRequest, res: Response) {
    try {
        const { titulo, mensaje, imagenes = [], tipo = 'AVISO' } = req.body;

        if (!titulo || !mensaje) {
            return res.status(400).json({
                error: 'El título y el mensaje son obligatorios.'
            });
        }

        const safeImages = Array.isArray(imagenes)
            ? imagenes.filter((key): key is string => typeof key === 'string' && isFileKeyOwnedByCondominium(key, req.user!.condominio_id))
            : [];
        if (safeImages.length !== (Array.isArray(imagenes) ? imagenes.length : 0)) {
            return res.status(400).json({ error: 'Una o más imágenes no pertenecen a este condominio.' });
        }

        const resultado = await broadcastService.sendMassNotice(
            req.user!.condominio_id,
            titulo,
            mensaje,
            safeImages,
            tipo === 'MEJORA' ? 'MEJORA' : 'AVISO'
        );

        return res.status(200).json(resultado);

    } catch (error: any) {
        return res.status(500).json({
            error: error.message || 'Error interno del servidor.'
        });
    }
}

export async function getBroadcastsHandler(req: AuthRequest, res: Response) {
    try {
        const result = await listBroadcasts(req.user!.condominio_id);
        const rows = await Promise.all(result.map(async (row) => ({
            ...row,
            imagenes: await Promise.all((Array.isArray(row.imagenes) ? row.imagenes : []).map((key: string) => getFileAccessUrl(key))),
        })));
        return res.status(200).json(rows);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

export async function deleteBroadcastHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const result = await deleteBroadcast(id as string,req.user!.condominio_id);
        if (!result) {
            return res.status(404).json({ error: 'Comunicado no encontrado.' });
        }

        return res.status(200).json({ message: 'Comunicado eliminado del historial.', comunicado: result });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
