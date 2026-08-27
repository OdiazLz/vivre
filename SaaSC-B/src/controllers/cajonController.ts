import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { 
  getAllCajones, 
  createCajon, 
  updateCajonEstatus, 
  deleteCajon,
  getReservasActivas,
  getParkingMonitor,
  liberarReserva
} from '../repositories/cajonRepository.js';

export async function getCajonesHandler(req: AuthRequest, res: Response) {
  try {
    const cajones = await getAllCajones(req.user!.condominio_id);
    return res.status(200).json(cajones);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCajonHandler(req: AuthRequest, res: Response) {
  try {
    const { codigo_cajon, tipo } = req.body;

    if (!codigo_cajon || !tipo) {
      return res.status(400).json({ error: 'Código de cajón y tipo son obligatorios.' });
    }
    if (!['VISITA', 'DISCAPACIDAD', 'RESIDENTE'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de cajón inválido.' });
    }

    const nuevoCajon = await createCajon(codigo_cajon.trim().toUpperCase(), tipo, req.user!.condominio_id);
    return res.status(201).json(nuevoCajon);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un cajón con ese código.' });
    }
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCajonHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { estatus } = req.body;

    if (!estatus || !['DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO'].includes(estatus)) {
      return res.status(400).json({ error: 'Estatus inválido. Debe ser DISPONIBLE, OCUPADO o MANTENIMIENTO.' });
    }

    const cajonActualizado = await updateCajonEstatus(id as string, estatus, req.user!.condominio_id);

    if (!cajonActualizado) {
      return res.status(404).json({ error: 'Cajón no encontrado.' });
    }

    return res.status(200).json({ message: 'Estatus del cajón actualizado.', cajon: cajonActualizado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteCajonHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await deleteCajon(id as string, req.user!.condominio_id);

    if (!deleted) {
      return res.status(404).json({ error: 'Cajón no encontrado.' });
    }

    return res.status(200).json({ message: 'Cajón eliminado correctamente.', cajon: deleted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Reservas
export async function getReservasActivasHandler(req: AuthRequest, res: Response) {
  try {
    const reservas = await getReservasActivas(req.user!.condominio_id);
    return res.status(200).json(reservas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getParkingMonitorHandler(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getParkingMonitor(req.user!.condominio_id));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function liberarReservaHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const reserva = await liberarReserva(id as string, req.user!.condominio_id);

    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada o ya finalizada.' });
    }

    return res.status(200).json({ message: 'Reserva finalizada y cajón liberado.', reserva });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
