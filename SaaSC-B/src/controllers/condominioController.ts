import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getCondominio, updateCondominio } from '../repositories/condominioRepository.js';
import { cleanPhoneNumber } from '../utils/phone.js';

export async function getCondominioHandler(req: AuthRequest, res: Response) {
  try {
    const condominio = await getCondominio(req.user!.condominio_id);
    return res.status(200).json(condominio);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCondominioHandler(req: AuthRequest, res: Response) {
  try {
    const { nombre, monto_cuota, dia_corte, banco, titular_cuenta, numero_cuenta, clabe, numero_tarjeta, instrucciones_pago, notificar_presidente_comprobante } = req.body;

    if (!nombre || monto_cuota === undefined || dia_corte === undefined) {
      return res.status(400).json({ error: 'Nombre, monto de cuota y día de corte son obligatorios.' });
    }

    if (typeof nombre !== 'string' || nombre.trim().length > 100 || !Number.isFinite(Number(monto_cuota)) || Number(monto_cuota) < 0 || !Number.isInteger(Number(dia_corte)) || Number(dia_corte) < 1 || Number(dia_corte) > 28) return res.status(400).json({ error: 'Configuración del condominio inválida.' });
    const clean = (value: unknown, max: number) => String(value || '').trim().slice(0, max) || null;
    const onlyDigits = (value: unknown) => String(value || '').replace(/\D/g, '');
    const account = onlyDigits(numero_cuenta);
    const clabeValue = onlyDigits(clabe);
    const card = onlyDigits(numero_tarjeta);
    const notifyPresident = notificar_presidente_comprobante === true;
    let presidentPhone: string | null = null;
    if (notifyPresident) {
      try { presidentPhone = cleanPhoneNumber(String(req.body.telefono_presidente_notificaciones || '')); }
      catch { return res.status(400).json({ error: 'Ingresa un número válido de 10 dígitos para notificar al Presidente.' }); }
    }
    if ((account && (account.length < 6 || account.length > 20)) || (clabeValue && clabeValue.length !== 18) || (card && card.length !== 16)) return res.status(400).json({ error: 'La cuenta debe tener 6 a 20 dígitos, la CLABE 18 y la tarjeta 16.' });
    const condominio = await updateCondominio(req.user!.condominio_id, nombre.trim(), Number(monto_cuota), Number(dia_corte), {
      banco: clean(banco, 100), titular_cuenta: clean(titular_cuenta, 160), numero_cuenta: account || null,
      clabe: clabeValue || null, numero_tarjeta: card || null, instrucciones_pago: clean(instrucciones_pago, 300),
      notificar_presidente_comprobante: notifyPresident, telefono_presidente_notificaciones: presidentPhone,
    });
    if (!condominio) return res.status(404).json({ error: 'Condominio no encontrado.' });

    return res.status(200).json(condominio);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
