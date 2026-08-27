import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { isFileKeyOwnedByCondominium } from '../services/storageService.js';
import { getAllMultas, createMulta, marcarMultaPagada } from '../repositories/multaRepository.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { getPrimaryUserByDepto } from '../repositories/userRepository.js';
import { isValidRegulationArticle } from '../repositories/catalogRepository.js';

export async function getMultasHandler(req: AuthRequest, res: Response) {
  try {
    const multas = await getAllMultas(req.user!.condominio_id);
    return res.status(200).json(multas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createMultaHandler(req: AuthRequest, res: Response) {
  try {
    const { motivo, articulo_reglamento, monto, evidencia_url, depto_id } = req.body;

    if (!motivo || !articulo_reglamento || !depto_id || !Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({ error: 'Motivo, artículo, monto positivo y depto_id son obligatorios.' });
    }
    if (!await isValidRegulationArticle(req.user!.condominio_id, articulo_reglamento)) {
      return res.status(400).json({ error: 'Artículo del Reglamento no válido.' });
    }
    if (evidencia_url && !isFileKeyOwnedByCondominium(evidencia_url, req.user!.condominio_id)) return res.status(400).json({ error: 'La evidencia no pertenece a este condominio.' });

    const nuevaMulta = await createMulta(motivo.trim(), articulo_reglamento, Number(monto), evidencia_url || null, depto_id, req.user!.condominio_id);
    if (!nuevaMulta) return res.status(404).json({ error: 'Departamento no encontrado en este condominio.' });

    // Notificar por WhatsApp al residente
    if (nuevaMulta && req.body.notificar_whatsapp !== false) {
      const residente = await getPrimaryUserByDepto(depto_id);
      const mensaje =
        '⚠️ *Notificación de Multa*\n\n' +
        `Hola ${residente?.nombre || 'Residente'},\n\n` +
        `📝 *Motivo:* ${motivo}\n` +
        `📜 *Artículo:* ${articulo_reglamento}\n` +
        `💵 *Monto:* $${monto} MXN\n\n` +
        `📍 Departamento: ${residente?.numero_depto || 'N/D'}\n\n` +
        `La multa quedó registrada. Para aclaraciones, contacta a administración. 📞`;

      if (residente?.telefono_whatsapp) {
        const cleanPhone = cleanPhoneNumber(residente.telefono_whatsapp);
        await sendMessageWhatssap(cleanPhone, mensaje);
      }
    }

    return res.status(201).json(nuevaMulta);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function marcarMultaPagadaHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const multa = await marcarMultaPagada(id as string, req.user!.condominio_id);

    if (!multa) {
      return res.status(404).json({ error: 'Multa no encontrada.' });
    }

    return res.status(200).json({ message: 'Multa marcada como pagada.', multa });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
