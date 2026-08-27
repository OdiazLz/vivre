import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getAllVisitas, createVisita, marcarSalidaVisita } from '../repositories/visitaRepository.js';
import { scopedDepartmentExists } from '../repositories/managementRepository.js';
import { getPrimaryUserByDepto } from '../repositories/userRepository.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';

export async function getVisitasHandler(req: AuthRequest, res: Response) {
  try {
    const visitas = await getAllVisitas(req.user!.condominio_id);
    return res.status(200).json(visitas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createVisitaHandler(req: AuthRequest, res: Response) {
  try {
    const { nombre_visitante, placas_auto, depto_id, cajon_asignado } = req.body;

    if (!nombre_visitante || !depto_id) {
      return res.status(400).json({ error: 'Nombre del visitante y depto_id son obligatorios.' });
    }

    if (!await scopedDepartmentExists(depto_id,req.user!.condominio_id)) return res.status(404).json({ error: 'Departamento no encontrado en este condominio.' });
    const nuevaVisita = await createVisita(nombre_visitante, placas_auto || null, depto_id, cajon_asignado || null);
    const residente = await getPrimaryUserByDepto(depto_id);
    if (residente?.telefono_whatsapp) {
      void sendMessageWhatssap(cleanPhoneNumber(residente.telefono_whatsapp), `🚗 *Visita registrada*\n\nVisitante: ${nombre_visitante}\nPlacas: ${placas_auto || 'Sin placas'}\nCajón: ${cajon_asignado || 'Sin asignar'}\nDepartamento: ${residente.numero_depto}`).catch(() => undefined);
    }
    return res.status(201).json(nuevaVisita);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function marcarSalidaVisitaHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const visita = await marcarSalidaVisita(id as string, req.user!.condominio_id);

    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada.' });
    }

    return res.status(200).json({ message: 'Salida registrada correctamente.', visita });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
