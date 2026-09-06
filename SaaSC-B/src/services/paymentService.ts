// src/services/paymentService.ts
import { getPaymentDetailsWithUser, reviewPaymentTransaction } from '../repositories/paymentRepository.js';
import { sendMessageWhatssap } from './whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';

export class PaymentService {
    public async reviewPayment(
        pagoId: string,
        nuevoEstatus: 'APROBADO' | 'RECHAZADO',
        montoAprobado: number | undefined,
        motivoRechazo: string | undefined,
        condominioId: string
    ) {
        const pago = await getPaymentDetailsWithUser(pagoId, condominioId);
        if (!pago) {
            throw new Error('Pago no encontrado');
        }

        const cleanPhone = cleanPhoneNumber(pago.telefono_whatsapp);
        const montoFinal = montoAprobado ?? parseFloat(pago.monto || '0');
        if (nuevoEstatus === 'APROBADO' && (!Number.isFinite(montoFinal) || montoFinal <= 0 || montoFinal > 10_000_000)) {
            throw new Error('El monto aprobado debe ser mayor a cero y tener un valor válido.');
        }
        const allocation = await reviewPaymentTransaction({ pagoId, condominioId, estatus:nuevoEstatus, monto:montoFinal });

        if (nuevoEstatus === 'APROBADO') {

            const mensajeAprobado =
                `✅ *¡Pago Aprobado!*\n\n` +
                `Hola *${pago.usuario_nombre}*, tu comprobante de pago para el *${pago.numero_depto}* por un monto de *$${montoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN* ha sido verificado. 🎉\n\n` +
                `Aplicado a adeudos: *$${allocation.aplicado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN*\n` +
                `Saldo a favor: *$${allocation.saldoFavor.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN*\n\n` +
                `¡Gracias por tu puntualidad!`;

            await sendMessageWhatssap(cleanPhone, mensajeAprobado);

        } else if (nuevoEstatus === 'RECHAZADO') {
            const razon = motivoRechazo ? `\n\n*Motivo:* ${motivoRechazo}` : '';
            const mensajeRechazado =
                `⚠️ *Comprobante No Validado*\n\n` +
                `Hola *${pago.usuario_nombre}*, tu comprobante de pago para el *${pago.numero_depto}* no pudo ser validado por la administración.${razon}\n\n` +
                `Por favor intenta enviar nuevamente una imagen clara del comprobante o contacta a la administración.`;

            await sendMessageWhatssap(cleanPhone, mensajeRechazado);
        }

        return { success: true, pago_id: pagoId, estatus: nuevoEstatus, aplicado:allocation.aplicado, saldo_favor:allocation.saldoFavor, cargos_liquidados:allocation.cargosLiquidados };
    }
}
