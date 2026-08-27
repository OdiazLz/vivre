import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { checkCondominioActivo } from './condominioStatusMiddleware.js';
import { findActiveAdminSession } from '../repositories/adminRepository.js';
import type { AdminRole as DomainAdminRole } from '../types/domain.js';

const JWT_SECRET = config.jwtSecret;

export interface AuthRequest extends Request {
  user?: {
    admin_id: string;
    condominio_id: string;
    email: string;
    rol: DomainAdminRole;
  };
}

export type AdminRole = NonNullable<AuthRequest['user']>['rol'];

export function authorizeRoles(...roles: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token de autenticación.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET, { issuer: 'vivre-api', audience: 'vivre-dashboard', algorithms: ['HS256'] }) as any;
    const current = await findActiveAdminSession(verified.admin_id);
    if (!current) return res.status(401).json({ error: 'La cuenta fue desactivada o ya no tiene acceso.' });
    if ((current.condominio_id || null) !== (verified.condominio_id || null) || current.rol !== verified.rol) return res.status(401).json({ error: 'La sesión ya no es válida.' });
    if (Number(current.session_version || 0) !== Number(verified.session_version || 0)) return res.status(401).json({ error: 'La sesión fue cerrada por un cambio de contraseña.' });
    req.user = { admin_id: current.id, condominio_id: current.condominio_id || '', email: current.email, rol: current.rol };
    return checkCondominioActivo(req, res, next);
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}
