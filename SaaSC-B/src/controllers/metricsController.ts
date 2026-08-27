import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getRecaudacionMensual } from '../repositories/metricsRepository.js';

export async function getRecaudacionHandler(req: AuthRequest, res: Response) {
  try {
    const recaudacion = await getRecaudacionMensual(req.user!.condominio_id);
    return res.status(200).json(recaudacion);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
