import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { PaymentService } from '../services/paymentService.js';
import { createCashPayment, getCashPaymentOptions, getPendingPayments, getPaymentSummary } from '../repositories/paymentRepository.js';
import { sendMessageWhatssap } from '../services/whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';

export class PaymentController {
    constructor(private paymentService: PaymentService) {}

    public async reviewPaymentHandler(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({ error: 'El body de la petición está vacío o no es válido JSON' });
            }

            const { estatus, monto_aprobado, motivo_rechazo } = req.body;

            if (!estatus) {
                return res.status(400).json({ error: 'El campo estatus es requerido' });
            }

            if (!['APROBADO', 'RECHAZADO'].includes(estatus)) {
                return res.status(400).json({ error: 'El estatus debe ser APROBADO o RECHAZADO' });
            }

            const result = await this.paymentService.reviewPayment(id as string, estatus, monto_aprobado, motivo_rechazo, req.user!.condominio_id);
            return res.status(200).json(result);

        } catch (error: any) {
            console.error('Error al revisar el pago:', error);
            return res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    }
    
    public async getPendingPaymentsHandler(req: AuthRequest, res: Response) {
        try {
            const payments = await getPendingPayments(req.user!.condominio_id);
            return res.status(200).json(payments);
        } catch (error: any) {
            console.error('Error al obtener pagos pendientes:', error);
            return res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    }

    public async getPaymentSummaryHandler(req: AuthRequest, res: Response) {
        try { return res.status(200).json(await getPaymentSummary(req.user!.condominio_id)); }
        catch (error: any) { return res.status(500).json({ error: error.message || 'Error al obtener el resumen de pagos' }); }
    }

    public async getCashPaymentOptionsHandler(req: AuthRequest, res: Response) {
        try { return res.json(await getCashPaymentOptions(req.user!.condominio_id)); }
        catch (error) { console.error('Error al cargar opciones de efectivo:', error); return res.status(500).json({ error: 'No fue posible cargar residentes y cargos.' }); }
    }

    public async createCashPaymentHandler(req: AuthRequest, res: Response) {
        try {
            const { recibido_por, usuario_id, depto_id, cargo_id, fecha_pago, notas } = req.body || {};
            const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const paymentDate = String(fecha_pago || '');
            if (![recibido_por,usuario_id,depto_id,cargo_id].every((value) => uuid.test(String(value))) || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(Date.parse(`${paymentDate}T12:00:00`)) || paymentDate > new Date().toISOString().slice(0,10) || String(notas || '').length > 300) return res.status(400).json({ error: 'Revisa residente, cargo, receptor, fecha y notas.' });
            const payment = await createCashPayment({ condominioId:req.user!.condominio_id, registradoPor:req.user!.admin_id, recibidoPor:recibido_por, usuarioId:usuario_id, deptoId:depto_id, cargoId:cargo_id, fechaPago:paymentDate, notas:String(notas||'').trim() });
            let notificado = false;
            if (payment.telefono_whatsapp) try { await sendMessageWhatssap(cleanPhoneNumber(payment.telefono_whatsapp), `💵 *Pago en efectivo registrado*\n\nHola *${payment.usuario_nombre}*, se abonaron *$${Number(payment.monto).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN* al departamento *${payment.numero_depto}*.\nConcepto: ${payment.concepto}\nRecibió: ${payment.receptor_nombre}\nFecha: ${payment.fecha_pago}\nFolio: *${String(payment.id).slice(0,8)}*\n\nSi no reconoces este movimiento, comunícate con administración.`); notificado = true; }
            catch (error) { console.error('No se pudo notificar el pago en efectivo:', error); }
            return res.status(201).json({ ...payment, notificado });
        } catch (error) {
            console.error('Error al registrar efectivo:', error);
            return res.status(409).json({ error: 'El cargo ya fue pagado o los datos dejaron de estar disponibles.' });
        }
    }
}
