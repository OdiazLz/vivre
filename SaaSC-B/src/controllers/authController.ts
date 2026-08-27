import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { findActiveAdminByEmail, touchAdminAccess } from '../repositories/adminRepository.js';

const JWT_SECRET = config.jwtSecret;

function normalizeAdminRole(role?: string) {
  return role === 'TESORERIA' ? 'TESORERO' : (role || 'ADMINISTRADOR');
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    const admin = await findActiveAdminByEmail(email);

    if (!admin) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
    await touchAdminAccess(admin.id);

    const token = jwt.sign(
      {
        admin_id: admin.id,
        condominio_id: admin.condominio_id,
        email: admin.email,
        rol: normalizeAdminRole(admin.rol),
        session_version: Number(admin.session_version || 0)
      },
      JWT_SECRET,
      { expiresIn: '8h', issuer: 'vivre-api', audience: 'vivre-dashboard', algorithm: 'HS256' }
    );

    return res.status(200).json({
      token,
      user: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
        condominio_id: admin.condominio_id,
        rol: normalizeAdminRole(admin.rol),
        condominio_estatus: admin.rol === 'SUPERADMIN' ? null : (admin.condominio_estatus || 'SUSPENDIDO')
      }
    });
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(500).json({ error: 'No fue posible iniciar sesión.' });
  }
}
