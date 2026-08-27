// src/services/paymentService.ts
import { getPaymentDetailsWithUser, updatePaymentStatus } from '../repositories/paymentRepository.js';
import { sendMessageWhatssap } from './whatsappService.js';
import type { EstadoPago } from '../types/payment.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { markCargoAsPaid } from '../repositories/cargoRepository.js';

export class PaymentService {
    public async reviewPayment(
        pagoId: string,
        nuevoEstatus: EstadoPago,
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

        await updatePaymentStatus(pagoId, {
            estatus: nuevoEstatus,
            monto_aprobado: montoFinal
        }, condominioId);

        if (nuevoEstatus === 'APROBADO') {

            console.log('Marking cargo as paid', pago.depto_id, pago.cargo_id);

            await markCargoAsPaid(pago.depto_id, pago.cargo_id);

            const mensajeAprobado =
                `✅ *¡Pago Aprobado!*\n\n` +
                `Hola *${pago.usuario_nombre}*, tu comprobante de pago para el *${pago.numero_depto}* por un monto de *$${montoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN* ha sido verificado y abonado a tu cuenta con éxito. 🎉\n\n` +
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

        return { success: true, pago_id: pagoId, estatus: nuevoEstatus };
    }
}
