import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { listLicensedCondominiums, updateCondominioStatus, type CondominioStatus } from '../repositories/licenseRepository.js';
import bcrypt from 'bcrypt';
import { createLicensedCondominium, condominiumExists, listCondominiumAdministrativeAccounts } from '../repositories/superAdminRepository.js';
import { findAdminById, updateAdminPassword } from '../repositories/adminRepository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASSWORD_ERROR = 'La contraseña debe tener entre 12 y 128 caracteres, mayúscula, minúscula, número y símbolo.';

function isStrongPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128
    && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export async function createCondominiumHandler(req: AuthRequest, res: Response) {
  try {
    const nombre = String(req.body?.nombre || '').trim();
    const montoCuota = Number(req.body?.monto_cuota);
    const diaCorte = Number(req.body?.dia_corte);
    const presidente = req.body?.presidente || {};
    const presidenteNombre = String(presidente.nombre || '').trim();
    const presidenteEmail = String(presidente.email || '').trim().toLowerCase();
    if (nombre.length < 3 || nombre.length > 100) return res.status(400).json({ error: 'El nombre de la privada debe tener entre 3 y 100 caracteres.' });
    if (!Number.isFinite(montoCuota) || montoCuota <= 0 || montoCuota > 1_000_000) return res.status(400).json({ error: 'La cuota mensual debe ser un monto positivo válido.' });
    if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 28) return res.status(400).json({ error: 'El día de corte debe estar entre 1 y 28.' });
    if (presidenteNombre.length < 3 || presidenteNombre.length > 120) return res.status(400).json({ error: 'El nombre del Presidente debe tener entre 3 y 120 caracteres.' });
    if (presidenteEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(presidenteEmail)) return res.status(400).json({ error: 'Ingresa un correo válido para el Presidente.' });
    if (!isStrongPassword(presidente.password)) return res.status(400).json({ error: PASSWORD_ERROR });

    const hash = await bcrypt.hash(presidente.password, 12);
    return res.status(201).json(await createLicensedCondominium({nombre,montoCuota,diaCorte,presidenteNombre,presidenteEmail,presidentePasswordHash:hash}));
  } catch (error: any) {
    console.error('Error creando condominio:', error);
    if (error.statusCode === 409) return res.status(409).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'El nombre de la privada o el correo ya están registrados.' });
    return res.status(500).json({ error: 'No fue posible registrar la privada.' });
  }
}

export async function listCondominiumsHandler(_req: AuthRequest, res: Response) {
  try { return res.json(await listLicensedCondominiums()); }
  catch (error) { console.error('Error listando licencias:', error); return res.status(500).json({ error: 'No fue posible consultar los condominios.' }); }
}

export async function updateCondominiumStatusHandler(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id || '');
    const status = req.body?.estatus as CondominioStatus;
    if (!UUID_PATTERN.test(id)) return res.status(400).json({ error: 'Identificador inválido.' });
    if (!['ACTIVO','SUSPENDIDO'].includes(status)) return res.status(400).json({ error: 'El estatus debe ser ACTIVO o SUSPENDIDO.' });
    const result = await updateCondominioStatus(id, status);
    return result ? res.json(result) : res.status(404).json({ error: 'Condominio no encontrado.' });
  } catch (error) { console.error('Error actualizando licencia:', error); return res.status(500).json({ error: 'No fue posible actualizar la licencia.' }); }
}

export async function listCondominiumAdministratorsHandler(req: AuthRequest, res: Response) {
  try {
    const condominioId = String(req.params.id || '');
    if (!UUID_PATTERN.test(condominioId)) return res.status(400).json({ error: 'Identificador inválido.' });
    if (!await condominiumExists(condominioId)) return res.status(404).json({ error: 'Condominio no encontrado.' });
    return res.json(await listCondominiumAdministrativeAccounts(condominioId));
  } catch (error) {
    console.error('Error listando cuentas del condominio:', error);
    return res.status(500).json({ error: 'No fue posible consultar las cuentas.' });
  }
}

export async function resetAdministratorPasswordAsSuperAdminHandler(req: AuthRequest, res: Response) {
  try {
    const administratorId = String(req.params.id || '');
    if (!UUID_PATTERN.test(administratorId)) return res.status(400).json({ error: 'Identificador inválido.' });
    if (!isStrongPassword(req.body?.password)) return res.status(400).json({ error: PASSWORD_ERROR });
    const target = await findAdminById(administratorId);
    if (!target) return res.status(404).json({ error: 'Cuenta no encontrada.' });
    if (target.rol === 'SUPERADMIN') return res.status(403).json({ error: 'Las cuentas Super Admin no pueden restablecerse desde este módulo.' });
    const hash = await bcrypt.hash(req.body.password, 12);
    await updateAdminPassword(administratorId,hash);
    return res.json({ message: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    return res.status(500).json({ error: 'No fue posible restablecer la contraseña.' });
  }
}
