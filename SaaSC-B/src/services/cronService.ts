import { getEventosHoy } from '../repositories/eventoRepository.js';
import { sendMessageWhatssap } from './whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { generateMonthlyCharges } from '../repositories/financialRepository.js';
import { getAllActiveUsers } from '../repositories/userRepository.js';
import { createDatabaseBackup } from './backupService.js';
import { disableResidentGateAccess, listActiveCondominiumsDueForBilling, listOverdueResidents } from '../repositories/scheduledJobRepository.js';
import { getCurrentRule } from '../repositories/regulationRepository.js';

export class CronService {
    private intervalId: NodeJS.Timeout | null = null;
    private executedJobs = new Set<string>();

    start() {
        // Render y otros hosts pueden suspender el proceso. Esta recuperación
        // idempotente evita perder la cuota por no estar activo en el minuto exacto.
        void this.generateMonthlyFees().catch((error) => console.error('Error recuperando cuotas mensuales:', error));

        // Ejecutar cada minuto para verificar si son las 11:30 PM
        this.intervalId = setInterval(async () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const dateKey = now.toISOString().slice(0, 10);

            // 11:30 PM = 23:30
            if (hours === 23 && minutes === 30 && this.once(`silencio-${dateKey}`)) {
                await this.sendSilenceAlert();
            }

            // Verificar morosidad cada día a las 9:00 AM
            if (hours === 9 && minutes === 0 && this.once(`morosidad-${dateKey}`)) {
                await this.checkOverduePayments();
            }

            if (hours === 8 && minutes === 0 && this.once(`cuotas-${dateKey}`)) {
                await this.generateMonthlyFees().catch((error) => console.error('Error generando cuotas mensuales:', error));
            }

            if (hours === 2 && minutes === 0 && this.once(`respaldo-${dateKey}`)) {
                await createDatabaseBackup().catch((error) => console.error('Error en respaldo automático:', error));
            }
        }, 60000); // 60000ms = 1 minuto
    }

    private once(key: string) {
        if (this.executedJobs.has(key)) return false;
        this.executedJobs.add(key);
        if (this.executedJobs.size > 60) this.executedJobs = new Set([...this.executedJobs].slice(-30));
        return true;
    }

    private async generateMonthlyFees() {
        const condominios = await listActiveCondominiumsDueForBilling();
        for (const condominioId of condominios) {
            const result = await generateMonthlyCharges(condominioId);
            if (!result.generados) continue;
            const usuarios = await getAllActiveUsers(condominioId);
            for (const usuario of usuarios) {
                await sendMessageWhatssap(
                    cleanPhoneNumber(usuario.telefono_whatsapp),
                    `🧾 *Cuota mensual generada*\n\nHola ${usuario.nombre}. Ya está disponible la cuota de mantenimiento de *${result.periodo}* para el departamento ${usuario.numero_depto}.\n\nEscribe *saldo* para consultar lo acumulado o *estado de cuenta* para recibir tu PDF.`
                ).catch((error) => console.error('No se pudo notificar cuota:', error));
            }
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async sendSilenceAlert() {
        try {
            const eventosHoy = await getEventosHoy();

            if (eventosHoy.length === 0) {
                return;
            }

            for (const evento of eventosHoy) {
                const eventRule = await getCurrentRule(evento.condominio_id, '6.2') || await getCurrentRule(evento.condominio_id, '6');
                const reminder = eventRule?.texto || 'Por favor reduce el nivel de ruido antes de las 12:00 AM.';
                const mensaje =
                    '🔕 *Alerta de Silencio*\\n\\n' +
                    'Hola ' + evento.usuario_nombre + ', 👋\\n\\n' +
                    '🎉 Tienes un evento programado hoy: *' + evento.titulo + '*\n' +
                    '🕐 Hora: ' + evento.hora_inicio + ' - ' + evento.hora_fin + '\n\n' +
                    '⚠️ *Regla vigente para eventos:*\\n' +
                    reminder.slice(0, 1200) + '\\n\\n' +
                    '📍 Departamento: ' + evento.numero_depto + '\\n\\n' +
                    '¡Gracias por tu cooperación! 🙏';

                if (evento.telefono_whatsapp) {
                    const cleanPhone = cleanPhoneNumber(evento.telefono_whatsapp);
                    await sendMessageWhatssap(cleanPhone, mensaje);
                }
            }
        } catch (error) {
            // Error silencioso para no interrumpir el cron
        }
    }

    private async checkOverduePayments() {
        try {
            // Buscar departamentos con pagos pendientes de más de 30 días
            const usuariosMorosos = await listOverdueResidents();

            if (usuariosMorosos.length === 0) {
                return;
            }

            for (const usuario of usuariosMorosos) {
                // Deshabilitar acceso al portón
                await disableResidentGateAccess(usuario.id);
                const accessRule = await getCurrentRule(usuario.condominio_id, '3.2') || await getCurrentRule(usuario.condominio_id, '3');
                const accessReason = accessRule?.texto || 'El acceso al portón y tarjetas puede deshabilitarse por adeudos pendientes de más de 30 días.';

                // Enviar notificación por WhatsApp
                const mensaje =
                    '⚠️ *Aviso Importante - Acceso Deshabilitado*\n\n' +
                    'Hola ' + usuario.nombre + ', 👋\n\n' +
                    '📍 Departamento: ' + usuario.numero_depto + '\n\n' +
                    '⏰ *Regla vigente aplicable:* ' + accessReason.slice(0, 1200) + '\n\n' +
                    '📝 Para reactivar tu acceso:\n' +
                    '• Realiza el pago de tu cuota pendiente\n' +
                    '• Envía tu comprobante por WhatsApp\n' +
                    '• Contacta a administración\n\n' +
                    '📞 ¿Tienes dudas? Comunícate con administración.\n\n' +
                    'Gracias por tu comprensión. 🙏';

                if (usuario.telefono_whatsapp) {
                    const cleanPhone = cleanPhoneNumber(usuario.telefono_whatsapp);
                    await sendMessageWhatssap(cleanPhone, mensaje);
                }
            }
        } catch (error) {
            // Error silencioso para no interrumpir el cron
        }
    }
}
