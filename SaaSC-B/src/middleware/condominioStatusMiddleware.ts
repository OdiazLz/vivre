import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './authMiddleware.js';
import { getCondominioStatus } from '../repositories/licenseRepository.js';

export async function checkCondominioActivo(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Acceso denegado.' });
  if (req.user.rol === 'SUPERADMIN') return next();
  if (!req.user.condominio_id) return res.status(403).json({ error: 'CONDOMINIO_SUSPENDIDO', message: 'La suscripción de este condominio se encuentra suspendida.' });
  try {
    const status = await getCondominioStatus(req.user.condominio_id);
    if (status !== 'ACTIVO') return res.status(403).json({ error: 'CONDOMINIO_SUSPENDIDO', message: 'La suscripción de este condominio se encuentra suspendida.' });
    return next();
  } catch (error) {
    console.error('No se pudo validar la licencia del condominio:', error);
    return res.status(503).json({ error: 'LICENCIA_NO_DISPONIBLE', message: 'No fue posible validar la suscripción.' });
  }
}
