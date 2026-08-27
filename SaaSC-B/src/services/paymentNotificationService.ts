import { getPaymentProofNotificationTarget } from '../repositories/condominioRepository.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { config } from '../config/index.js';
import { sendMessageWhatssap, sendWhatsAppTemplate } from './whatsappService.js';

export async function notifyPresidentOfPaymentProof(input: {
  condominioId: string;
  residentName: string;
  departmentNumber: string;
  paymentId: string;
}) {
  const target = await getPaymentProofNotificationTarget(input.condominioId);
  if (!target) return { sent: false, reason: 'DISABLED_OR_MISSING_TARGET' as const };

  const phone = cleanPhoneNumber(target);
  if (config.whatsapp.paymentProofTemplate) {
    await sendWhatsAppTemplate(phone, config.whatsapp.paymentProofTemplate, [
      input.residentName,
      input.departmentNumber,
      input.paymentId.slice(0, 8),
    ], config.whatsapp.templateLanguage);
  } else await sendMessageWhatssap(phone,
    `🔔 *Nuevo comprobante por revisar*\n\n` +
    `Residente: *${input.residentName}*\n` +
    `Departamento: *${input.departmentNumber}*\n` +
    `Folio: *${input.paymentId.slice(0, 8)}*\n\n` +
    `Ingresa al panel de gerencia, módulo *Comprobantes*, para validarlo.\n\n` +
    `⚠️ Este aviso no significa que el pago ya fue aprobado.`
  );
  return { sent: true as const };
}
