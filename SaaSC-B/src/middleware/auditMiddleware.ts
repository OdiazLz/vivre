import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './authMiddleware.js';
import { createAuditEntry } from '../repositories/auditRepository.js';

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'token', 'authorization', 'numero_cuenta', 'clabe', 'numero_tarjeta']);

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.length > 20
    ? { total: value.length, muestra: value.slice(0, 10).map(sanitize) }
    : value.map(sanitize);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTADO]' : sanitize(item),
    ])
  );
}

export function auditMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path === '/api/auth/login') {
    return next();
  }

  res.on('finish', () => {
    if (!req.user || res.statusCode >= 400) return;
    const modulo = req.path.split('/').filter(Boolean)[1] || 'sistema';
    void createAuditEntry({condominioId:req.user.condominio_id||null,administradorId:req.user.admin_id,email:req.user.email,rol:req.user.rol,accion:req.method,modulo,recurso:req.originalUrl,datos:sanitize(req.body),ip:req.ip}).catch((error)=>console.error('No se pudo registrar auditoría:',error));
  });
  next();
}
