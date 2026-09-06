import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { buildGeneralState, generateMonthlyCharges, getAccountStatement, getManagementAnalytics } from '../repositories/financialRepository.js';
import { createStatementPdf } from '../services/pdfService.js';
import { createDatabaseBackup } from '../services/backupService.js';
import { getFileAccessUrl, isFileKeyOwnedByCondominium } from '../services/storageService.js';
import { getAllActiveUsers } from '../repositories/userRepository.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import bcrypt from 'bcrypt';
import { ASSIGNABLE_ADMIN_ROLES, PRESIDENT_ASSIGNABLE_ADMIN_ROLES, type AssignableAdminRole } from '../types/domain.js';
import { createCondominiumAdmin, findScopedAdmin, listCondominiumAdmins, setScopedAdminActive, updateScopedAdminPassword, updateScopedAdminRole } from '../repositories/adminRepository.js';
import { MANAGEMENT_EXPORTS, createExpense, exportManagementModule, listAudit, listBackups, listExpenses, scopedDepartmentExists } from '../repositories/managementRepository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getAuditHandler(req: AuthRequest, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    return res.json(await listAudit(req.user!.condominio_id,limit));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getAnalyticsHandler(req: AuthRequest, res: Response) {
  try { return res.json(await getManagementAnalytics(req.user!.condominio_id)); }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function generateChargesHandler(req: AuthRequest, res: Response) {
  try {
    const generated = await generateMonthlyCharges(req.user!.condominio_id, req.body.periodo);
    if (generated.generados > 0) {
      const users = await getAllActiveUsers(req.user!.condominio_id);
      void Promise.allSettled(users.map((user) => sendMessageWhatssap(cleanPhoneNumber(user.telefono_whatsapp), `🧾 *Cuota mensual generada*\n\nHola ${user.nombre}. La cuota de mantenimiento de *${generated.periodo}* ya está disponible para el departamento ${user.numero_depto}.\n\nEscribe *saldo* para consultar lo acumulado.`)));
    }
    return res.status(201).json(generated);
  }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function financialStateHandler(req: AuthRequest, res: Response) {
  try {
    return res.json(await buildGeneralState(req.user!.condominio_id, req.query.periodo as string | undefined, false));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function publishFinancialStateHandler(req: AuthRequest, res: Response) {
  try { return res.json(await buildGeneralState(req.user!.condominio_id, req.body.periodo, true)); }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function createExpenseHandler(req: AuthRequest, res: Response) {
  try {
    const { categoria, concepto, monto, fecha, comprobante_url } = req.body;
    if (!categoria || !concepto || !Number.isFinite(Number(monto)) || Number(monto) <= 0) return res.status(400).json({ error: 'Categoría, concepto y monto positivo son obligatorios.' });
    if (comprobante_url && (typeof comprobante_url !== 'string' || !isFileKeyOwnedByCondominium(comprobante_url, req.user!.condominio_id))) return res.status(400).json({ error: 'El comprobante no pertenece a este condominio.' });
    return res.status(201).json(await createExpense({condominioId:req.user!.condominio_id,categoria,concepto,monto:Number(monto),fecha:fecha||null,comprobanteUrl:comprobante_url||null}));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getExpensesHandler(req: AuthRequest, res: Response) {
  try { const rows=await listExpenses(req.user!.condominio_id); return res.json(await Promise.all(rows.map(async (row) => ({ ...row, comprobante_url: await getFileAccessUrl(row.comprobante_url) })))); }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function departmentStatementPdfHandler(req: AuthRequest, res: Response) {
  try {
    const deptoId = req.params.id as string;
    if (!await scopedDepartmentExists(deptoId,req.user!.condominio_id)) return res.status(404).json({ error: 'Departamento no encontrado.' });
    const state = await getAccountStatement(deptoId);
    const filename = `estado-${state.departamento.numero_depto}-${Date.now()}.pdf`;
    const file = await createStatementPdf([
      `Estado de cuenta - Departamento ${state.departamento.numero_depto}`,
      `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
      `Cuotas pendientes: $${state.total_cargos.toFixed(2)} MXN`,
      `Multas pendientes: $${state.total_multas.toFixed(2)} MXN`,
      `Pagos en revision: $${state.pagos_revision.toFixed(2)} MXN`,
      `Saldo acumulado: $${state.saldo_total.toFixed(2)} MXN`,
      `Saldo a favor: $${state.saldo_favor.toFixed(2)} MXN`,
    ], filename);
    return res.download(file, filename);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function exportCsvHandler(req: AuthRequest, res: Response) {
  try {
    const moduleName = req.params.modulo as string;
    const allowedModules = ['ADMINISTRADOR', 'PRESIDENTE'].includes(req.user!.rol) ? MANAGEMENT_EXPORTS : ['pagos', 'multas'];
    if (!allowedModules.includes(moduleName)) return res.status(403).json({ error: 'No tienes permisos para exportar este módulo.' });
    const result = await exportManagementModule(moduleName,req.user!.condominio_id);
    if (!result) return res.status(400).json({ error: 'Módulo de exportación inválido.' });
    const headers = result.fields.map((field) => field.name);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [headers.join(','), ...result.rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${moduleName}-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function backupHandler(req: AuthRequest, res: Response) {
  try { return res.status(201).json(await createDatabaseBackup(req.user!.condominio_id)); }
  catch (error: any) { return res.status(500).json({ error: error.message || 'No se pudo crear el respaldo.' }); }
}

export async function backupHistoryHandler(req: AuthRequest, res: Response) {
  try { return res.json(await listBackups(req.user!.condominio_id)); }
  catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function getAdministratorsHandler(req: AuthRequest, res: Response) {
  try {
    return res.json(await listCondominiumAdmins(req.user!.condominio_id));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function resetAdministratorPasswordHandler(req: AuthRequest, res: Response) {
  try {
    if (!UUID_PATTERN.test(String(req.params.id || ''))) return res.status(400).json({ error: 'Identificador inválido.' });
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 12 y 128 caracteres, mayúscula, minúscula, número y símbolo.' });
    }
    if (req.params.id === req.user!.admin_id) return res.status(400).json({ error: 'No puedes restablecer tu propia contraseña desde este módulo.' });
    const target = await findScopedAdmin(req.params.id as string, req.user!.condominio_id);
    if (!target) return res.status(404).json({ error: 'Cuenta no encontrada en tu condominio.' });
    const rolesByActor: Record<string, string[]> = {
      ADMINISTRADOR: ['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'],
      PRESIDENTE: ['SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'],
    };
    if (!rolesByActor[req.user!.rol]?.includes(target.rol)) return res.status(403).json({ error: 'No tienes permiso para restablecer la contraseña de esta cuenta.' });
    if (!target.activo) return res.status(409).json({ error: 'La cuenta está inactiva. Reactívala antes de cambiar su contraseña.' });
    const hash = await bcrypt.hash(password, 12);
    await updateScopedAdminPassword(req.params.id as string, req.user!.condominio_id, hash);
    return res.json({ message: 'Contraseña restablecida correctamente.' });
  } catch (error: any) { return res.status(500).json({ error: error.message || 'No fue posible restablecer la contraseña.' }); }
}

export async function updateAdministratorRoleHandler(req: AuthRequest, res: Response) {
  try {
    if (!ASSIGNABLE_ADMIN_ROLES.includes(req.body.rol)) return res.status(400).json({ error: 'Rol inválido.' });
    if (req.params.id === req.user!.admin_id) return res.status(400).json({ error: 'No puedes modificar tu propio rol.' });
    const target = await findScopedAdmin(req.params.id as string, req.user!.condominio_id);
    if (!target || target.rol === 'ADMINISTRADOR') return res.status(403).json({ error: 'No se puede modificar otra cuenta Administrador.' });
    const result = await updateScopedAdminRole(req.params.id as string, req.user!.condominio_id, req.body.rol as AssignableAdminRole);
    if (!result) return res.status(404).json({ error: 'Administrador no encontrado.' });
    return res.json(result);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}

export async function createAdministratorHandler(req: AuthRequest, res: Response) {
  try {
    const { nombre, email, password, rol } = req.body;
    const cleanName = String(nombre || '').trim();
    const cleanEmail = String(email || '').trim();
    const allowedRoles: readonly string[] = req.user!.rol === 'PRESIDENTE' ? PRESIDENT_ASSIGNABLE_ADMIN_ROLES : ASSIGNABLE_ADMIN_ROLES;
    if (cleanName.length < 3 || cleanName.length > 120 || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !allowedRoles.includes(rol)) return res.status(400).json({ error: 'Nombre, correo válido y un rol permitido del comité son obligatorios.' });
    if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'La contraseña debe tener entre 12 y 128 caracteres, mayúscula, minúscula, número y símbolo.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await createCondominiumAdmin({condominioId:req.user!.condominio_id,nombre:cleanName,email:cleanEmail,passwordHash:hash,rol:rol as AssignableAdminRole});
    return res.status(201).json(result);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'El correo ya está registrado.' });
    return res.status(500).json({ error: error.message });
  }
}

export async function setAdministratorActiveHandler(req: AuthRequest, res: Response) {
  try {
    if (typeof req.body.activo !== 'boolean') return res.status(400).json({ error: 'activo debe ser booleano.' });
    if (req.params.id === req.user!.admin_id) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
    const target = await findScopedAdmin(req.params.id as string, req.user!.condominio_id);
    if (!target || target.rol === 'ADMINISTRADOR') return res.status(403).json({ error: 'No se puede modificar otra cuenta Administrador.' });
    return res.json(await setScopedAdminActive(req.params.id as string, req.user!.condominio_id, req.body.activo));
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}
