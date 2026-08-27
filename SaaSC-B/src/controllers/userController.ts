import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getAllUsers, getAllDepartamentos, createUser, updateUser, deleteUser, updateAccesoPorton, importUsersBulk } from '../repositories/userRepository.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';

export async function getDepartamentosHandler(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getAllDepartamentos(req.user!.condominio_id));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}

export async function getUsersHandler(req: AuthRequest, res: Response) {
  try {
    const users = await getAllUsers(req.user!.condominio_id);
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createUserHandler(req: AuthRequest, res: Response) {
  try {
    const { nombre, depto_id, numero_depto, telefono_whatsapp, rol, activo = true } = req.body;

    if (!nombre || (!depto_id && !numero_depto?.trim()) || !telefono_whatsapp) {
      return res.status(400).json({ error: 'Nombre, departamento y telefono_whatsapp son obligatorios.' });
    }
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'activo debe ser booleano.' });
    }

    const nuevoUsuario = await createUser(
      nombre.trim(),
      cleanPhoneNumber(telefono_whatsapp),
      depto_id,
      numero_depto?.trim(),
      req.user!.condominio_id,
      rol,
      activo
    );
    return res.status(201).json(nuevoUsuario);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateUserHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, depto_id, numero_depto, telefono_whatsapp, rol, activo = true } = req.body;

    if (!nombre || (!depto_id && !numero_depto?.trim()) || !telefono_whatsapp) {
      return res.status(400).json({ error: 'Nombre, departamento y telefono_whatsapp son obligatorios.' });
    }
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'activo debe ser booleano.' });
    }

    const usuarioActualizado = await updateUser(
      id as string,
      nombre.trim(),
      cleanPhoneNumber(telefono_whatsapp),
      depto_id,
      numero_depto?.trim(),
      req.user!.condominio_id,
      rol,
      activo
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ error: 'Residente no encontrado.' });
    }

    return res.status(200).json({ message: 'Residente actualizado con éxito.', usuario: usuarioActualizado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteUserHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const usuarioEliminado = await deleteUser(id as string, req.user!.condominio_id);

    if (!usuarioEliminado) {
      return res.status(404).json({ error: 'Residente no encontrado.' });
    }

    return res.status(200).json({ message: 'Residente eliminado con éxito.', usuario: usuarioEliminado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateAccesoPortonHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { acceso_porton } = req.body;

    if (typeof acceso_porton !== 'boolean') {
      return res.status(400).json({ error: 'acceso_porton debe ser booleano.' });
    }

    const usuarioActualizado = await updateAccesoPorton(id as string, acceso_porton, req.user!.condominio_id);

    if (!usuarioActualizado) {
      return res.status(404).json({ error: 'Residente no encontrado.' });
    }

    return res.status(200).json({ message: acceso_porton ? 'Acceso al portón habilitado.' : 'Acceso al portón deshabilitado.', usuario: usuarioActualizado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function importUsersHandler(req: AuthRequest, res: Response) {
  try {
    const rows = req.body?.residentes;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
      return res.status(400).json({ error: 'Envía entre 1 y 500 residentes por importación.' });
    }

    const valid: Array<{ fila: number; nombre: string; numero_depto: string; telefono_whatsapp: string }> = [];
    const errors: Array<{ fila: number; motivo: string }> = [];
    const phonesInFile = new Set<string>();
    rows.forEach((row: unknown, index: number) => {
      const record = row && typeof row === 'object' ? row as Record<string, unknown> : {};
      const fila = Number(record.fila) || index + 2;
      const nombre = String(record.nombre || '').trim().replace(/\s+/g, ' ');
      const numero_depto = String(record.numero_depto || '').trim().replace(/\s+/g, ' ');
      let phone = '';
      try { phone = cleanPhoneNumber(String(record.telefono_whatsapp || '')); }
      catch { errors.push({ fila, motivo: 'El teléfono debe contener 10 dígitos de México.' }); return; }
      if (nombre.length < 3 || nombre.length > 120) { errors.push({ fila, motivo: 'El nombre debe tener entre 3 y 120 caracteres.' }); return; }
      if (!numero_depto || numero_depto.length > 20) { errors.push({ fila, motivo: 'El departamento es obligatorio y admite máximo 20 caracteres.' }); return; }
      if (phonesInFile.has(phone)) { errors.push({ fila, motivo: 'El teléfono está repetido dentro del archivo.' }); return; }
      phonesInFile.add(phone);
      valid.push({ fila, nombre, numero_depto, telefono_whatsapp: phone });
    });

    if (!valid.length) return res.status(400).json({ error: 'El archivo no contiene filas válidas.', errores: errors });
    const result = await importUsersBulk(req.user!.condominio_id, valid);

    if (req.body.notificar_whatsapp !== false) {
      void Promise.allSettled(result.created.map((resident) => sendMessageWhatssap(
        resident.telefono_whatsapp,
        `👋 *Bienvenido a la comunidad*\n\nHola ${resident.nombre}. Tu número quedó registrado para el departamento *${resident.numero_depto}*.\n\nEscribe *Menú* para consultar saldo, estado de cuenta, visitas y servicios del condominio.`
      )));
    }
    return res.status(201).json({
      total_recibidos: rows.length,
      creados: result.created.length,
      omitidos: result.skipped.length,
      invalidos: errors.length,
      errores: [...errors, ...result.skipped.map((item) => ({ fila: item.fila, motivo: item.motivo }))],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'No se pudo importar a los residentes.' });
  }
}
