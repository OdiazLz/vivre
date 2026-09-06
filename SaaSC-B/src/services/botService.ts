import { sendMessageWhatssap, sendRawMessage, sendWhatsAppDocument, sendWhatsAppImage } from './whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { downloadWhatssapMedia } from './mediaService.js';
import { createPaymentRecord } from '../repositories/paymentRepository.js';
import { getUserByPhone } from '../repositories/userRepository.js';
import { sendWhatsAppButton } from './whatsappService.js';
import { createIncidencia } from '../repositories/incidenciaRepository.js';
import { createMascota } from '../repositories/mascotaRepository.js';
import { createVisita, getCajonDisponible } from '../repositories/visitaRepository.js';
import { cancelEventoByUser, createEvento, getUpcomingEventsByUser, updateEventoByUser } from '../repositories/eventoRepository.js';
import { getCajonesDisponibles, getCajonByCodigo, createReserva, getReservaActivaByUsuario, liberarReserva } from '../repositories/cajonRepository.js';
import { ensureMonthlyChargesDue, getAccountStatement, getPublishedGeneralState } from '../repositories/financialRepository.js';
import { createStatementPdf } from './pdfService.js';
import { config } from '../config/index.js';
import { createRegistrationRequest, getPhoneMemberships, getWhatsAppSession, saveWhatsAppSession, validateInvitationCode } from '../repositories/registrationRepository.js';
import { getLatestImprovements } from './broadcastService.js';
import { getFileAccessUrl } from './storageService.js';
import { getCondominio } from '../repositories/condominioRepository.js';
import { castAssemblyVotes, getOpenAssemblies } from '../repositories/assemblyRepository.js';
import { interpretBotIntent, isCondominiumRelatedMessage, type BotIntent } from './aiIntentService.js';
import { getCondominioStatus } from '../repositories/licenseRepository.js';
import { matchDeterministicCommand } from './bot/commandRouter.js';
import { notifyPresidentOfPaymentProof } from './paymentNotificationService.js';
import { formatCurrentRegulation, getCurrentRule } from '../repositories/regulationRepository.js';

export class BotService {
public async sendMainMenu(phone: string, nombre: string) {
    const cleanPhone = cleanPhoneNumber(phone);

    try {
        await sendWhatsAppButton(
            cleanPhone,
            `🏢 *Menú principal*\n\n¡Hola ${nombre}! ¿Qué necesitas consultar?`,
            [
                { id: 'btn_saldo', title: 'Consultar saldo' },
                { id: 'btn_datos_pago', title: 'Datos para pagar' },
                { id: 'btn_mas_opciones', title: 'Más opciones' },
            ],
            'Vivre · Asistente condominal'
        );
    } catch {
        await sendMessageWhatssap(
            cleanPhone,
            `🏢 *Menú principal*\n\n¡Hola ${nombre}!\n\nEscribe una opción:\n• *SALDO*\n• *DATOS PARA PAGAR*\n• *ESTADO DE CUENTA*\n• *REGLAMENTO*\n• *ASAMBLEAS*\n• *CAJONES*\n• *OBRAS*`
        );
    }
}

private async sendExtendedMenu(phone: string) {
    const cleanPhone = cleanPhoneNumber(phone);

    const messageData = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: '📋 Más opciones' },
            body: { text: 'Selecciona el servicio que necesitas:' },
            footer: { text: 'Vivre · Asistente condominal' },
            action: {
                button: 'Ver opciones',
                sections: [
                    {
                        title: 'Servicios Principales',
                        rows: [
                            { id: 'btn_cuenta', title: '📄 Estado de cuenta', description: 'Recibir el detalle en PDF' },
                            { id: 'btn_transparencia', title: '📊 Estado general', description: 'Consultar el reporte publicado' },
                            { id: 'btn_pago', title: '📄 Enviar Comprobante', description: 'Adjuntar foto o PDF de pago' },
                            { id: 'btn_votaciones', title: '🗳️ Asambleas', description: 'Consultar y emitir votos' },
                            { id: 'btn_incidencia', title: '🛠️ Reportar Falla', description: 'Incidencias en áreas comunes' },
                            { id: 'btn_evento', title: '🎉 Registrar Evento', description: 'Reuniones según el reglamento vigente' },
                            { id: 'btn_mis_eventos', title: '📅 Mis eventos', description: 'Consultar, editar o cancelar eventos' },
                            { id: 'btn_cajones', title: '🚗 Estacionamiento', description: 'Consultar y apartar cajón EV' },
                            { id: 'btn_reglamento', title: '📜 Ver Reglamento', description: 'Normas y multas del residencial' },
                            { id: 'btn_mejoras', title: '🏗️ Mejoras', description: 'Consultar avances y trabajos terminados' }
                        ]
                    }
                ]
            }
        }
    };

    await sendRawMessage(messageData);
}

    public async processIncomingMessage(rawPhone: string, text: string): Promise<void> {
        const phone = cleanPhoneNumber(rawPhone);
        const registeredUser = await getUserByPhone(phone);
        if (registeredUser && await this.rejectSuspendedCondominium(phone, registeredUser.condominio_id)) return;
        if (await this.processOnboarding(phone, text)) return;
        const usuario = registeredUser || await getUserByPhone(phone);

        if (!usuario) {
            await sendMessageWhatssap(
                phone,
                '👋 ¡Hola!\n\nTu número todavía no está registrado.\n\nSi recibiste una invitación, envía *ALTA* seguido de tu código.\nEjemplo: *ALTA CRATER-A1B2C3*\n\nTambién puedes contactar al comité de tu privada.'
            );
            return;
        }

        const command=matchDeterministicCommand(text);
        switch(command){
            case'MENU':return this.sendMainMenu(phone,usuario.nombre);
            case'OBRAS':return this.processImprovements(phone,usuario.condominio_id);
            case'MASCOTA':return this.processMascotaRegistration(phone,text);
            case'VISITA':return this.processVisitaRegistration(phone,text);
            case'MIS_EVENTOS':return this.processMyEvents(phone);
            case'CANCELAR_EVENTO':return this.processCancelEvent(phone,text);
            case'EDITAR_EVENTO':return this.processEditEvent(phone,text);
            case'EVENTO':return this.processEventoRegistration(phone,text);
            case'TRANSPARENCIA':return this.processTransparencia(phone);
            case'ASAMBLEAS':return this.processAssemblies(phone,usuario.condominio_id);
            case'VOTAR':return this.processVote(phone,text);
            case'DATOS_PAGO':return this.processPaymentDetails(phone,usuario.condominio_id);
            case'SALDO':return this.processSaldo(phone,false);
            case'ESTADO_CUENTA':return this.processSaldo(phone,true);
            case'CAJONES':return this.processCajones(phone);
            case'APARTAR_CAJON':return this.processApartarCajon(phone,text);
            case'LIBERAR_CAJON':return this.processLiberarCajon(phone,text);
            case'REPORTE':return this.processMessageText(phone,text);
        }

        if (!isCondominiumRelatedMessage(text)) {
            await sendMessageWhatssap(phone, '🏢 Sólo puedo ayudarte con asuntos del condominio. Prueba preguntándome sobre tu saldo, reglamento, visitas, estacionamiento, pagos, eventos o asambleas.');
            return;
        }

        const aiIntent = await interpretBotIntent(text, phone);
        if (aiIntent && aiIntent.intent !== 'DESCONOCIDO') {
            await this.processReadIntent(phone, usuario, aiIntent.intent);
            return;
        }

        return await sendMessageWhatssap(
            phone,
            `👋 Hola ${usuario.nombre}!\n\nNo entendí tu mensaje. 🤔\n\nPara ayudarte mejor, por favor envía la palabra *Menú* para ver las opciones disponibles.\n\nO puedes escribir:\n• *Reporte* + descripción (para reportar un problema)\n• *Obras* (para ver avances de mantenimiento)'`
        );
    }

    public async processInteractiveReply(phone: string, buttonId: string): Promise<void> {
        const usuario = await getUserByPhone(phone);
        if (!usuario) {
            await sendMessageWhatssap(phone, '⚠️ Usuario no registrado.');
            return;
        }
        if (await this.rejectSuspendedCondominium(phone, usuario.condominio_id)) return;

        switch (buttonId) {
            case 'btn_saldo':
                await this.processSaldo(phone, false);
                break;
            case 'btn_mas_opciones':
                await this.sendExtendedMenu(phone);
                break;
            case 'btn_cuenta':
                await this.processSaldo(phone, true);
                break;
            case 'btn_transparencia':
                await this.processTransparencia(phone);
                break;
            case 'btn_pago':
                await sendMessageWhatssap(
                    phone,
                    '📄 *Enviar Comprobante de Pago*\n\nPor favor adjunta la foto o PDF de tu transferencia bancaria.\n\n📸 Asegúrate que sea legible.'
                );
                break;
            case 'btn_datos_pago':
                await this.processPaymentDetails(phone, usuario.condominio_id);
                break;
            case 'btn_votaciones':
                await this.processAssemblies(phone, usuario.condominio_id);
                break;
            case 'btn_incidencia':
                await sendMessageWhatssap(
                    phone,
                    '🛠️ *Reportar Incidencia*\n\nPor favor envía: "reporte [descripción]"\n\nEjemplo: "reporte La luz del pasillo está dañada"'
                );
                break;
            case 'btn_evento':
                await sendMessageWhatssap(
                    phone,
                    '🎉 *Avisar Evento*\n\nPor favor envía: "evento [Fecha] [Hora] [Título]"\n\nEjemplo: "evento 2026-08-29 19:00 Cumpleaños Juan"\n\nAplican las reglas vigentes de eventos de tu privada.'
                );
                break;
            case 'btn_mis_eventos':
                await this.processMyEvents(phone);
                break;
            case 'btn_cajones':
                await this.processCajones(phone);
                break;
            case 'btn_reglamento':
                await sendMessageWhatssap(phone, await formatCurrentRegulation(usuario.condominio_id) || '📘 El Reglamento todavía no ha sido publicado por la administración.');
                break;
            case 'btn_mejoras':
                await this.processImprovements(phone, usuario.condominio_id);
                break;
            default:
                await sendMessageWhatssap(phone, '⚠️ Opción no reconocida. Por favor intenta de nuevo.');
        }
    }

    public async processMessageText(from: string, text: string): Promise<void> {
        const textBody = text.trim().toLowerCase();

        try {
            const user = await getUserByPhone(from);

            if (!user) {
                await sendMessageWhatssap(
                    from,
                    '👋 ¡Hola!\n\nLo siento, pero tu número no está registrado en nuestro sistema. 🏢\n\nPor favor contacta al administrador del condominio para darte de alta.\n\n📞 ¿Necesitas ayuda? Comunícate con administración.'
                );
                return;
            }

            if (textBody.includes('estado') || textBody.includes('saldo') || textBody.includes('hola')) {
                await ensureMonthlyChargesDue(user.condominio_id);
                const estado = await getAccountStatement(user.depto_id);

                const respuesta =
                    `🏠 *Hola, ${user.nombre}*\n📍 Departamento: ${user.numero_depto}\n\n` +
                    `💰 *Tu saldo actual:* $${Number(estado.saldo_total).toFixed(2)} MXN\n\n` +
                    `📌 *Opciones disponibles:*\n` +
                    `📸 Envía la foto de tu comprobante para registrar pago\n` +
                    `🏗️ Escribe "obras" para ver avances de mantenimiento\n` +
                    `📝 Escribe "reporte" + descripción para reportar un problema`;

                await sendMessageWhatssap(from, respuesta);
            }

            if (textBody.startsWith('reporte') || textBody.includes('reporte')) {
                const detalle = text.replace(/^(reporte|incidencia)\s*/i, '').trim();
                if (!detalle) {
                    await sendMessageWhatssap(
                        from,
                        '❌ *Reporte Incompleto*\n\nPor favor proporciona una descripción del problema.\n\nEjemplo: "Reporte El portón no cierra completamente"'
                    );
                    return;
                }

                await createIncidencia(user.depto_id, user.id, detalle, undefined, user.condominio_id);

                await sendMessageWhatssap(
                    from,
                    '✅ *Reporte Enviado*\n\n📝 Hemos recibido tu reporte correctamente.\n\n👷 La administración lo revisará a la brevedad y te notificaremos cuando sea atendido.\n\n📍 Departamento: ' + user.numero_depto + '\n\nGracias por ayudarnos a mejorar el condominio. 🙏'
                );
            }
        } catch (error) {
            await sendMessageWhatssap(
                from,
                '❌ *Error*\n\nHubo un problema al procesar tu mensaje. Por favor intenta de nuevo más tarde.\n\nSi el problema persiste, contacta a administración.'
            );
        }
    }

    public async processIncomingPayment(rawPhone: string, mediaId: string, fileName: string): Promise<void> {
        try {
            const phone = cleanPhoneNumber(rawPhone);

            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                return await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.\n\nPor favor contacta a administración para verificar tu registro.'
                );
            }
            if (await this.rejectSuspendedCondominium(phone, usuario.condominio_id)) return;

            const localFilePath = await downloadWhatssapMedia(mediaId, fileName, usuario.condominio_id);

            const payment = await createPaymentRecord({
                depto_id: usuario.depto_id,
                monto: 0,
                comprobante_url: localFilePath,
                cargo_id: null
            });

            const mensajeConfirmacion =
                `✅ *Comprobante Recibido*\n\n` +
                `¡Gracias, ${usuario.nombre}! 🙌\n\n` +
                `📸 Hemos recibido tu comprobante de pago correctamente.\n` +
                `📍 Departamento: ${usuario.numero_depto}\n\n` +
                `👷 La administración revisará tu pago a la brevedad.\n` +
                `📱 Te notificaremos cuando sea aprobado.\n\n` +
                `⏰ Tiempo estimado de revisión: 24-48 horas\n\n` +
                `¿Tienes dudas? Contacta a administración. 📞`;

            const notifications = await Promise.allSettled([
                sendMessageWhatssap(phone, mensajeConfirmacion),
                notifyPresidentOfPaymentProof({
                    condominioId: usuario.condominio_id,
                    residentName: usuario.nombre,
                    departmentNumber: usuario.numero_depto,
                    paymentId: payment.id,
                }),
            ]);
            if (notifications[0].status === 'rejected') throw notifications[0].reason;
            if (notifications[1].status === 'rejected') console.error('No se pudo notificar el comprobante al Presidente.', notifications[1].reason);

        } catch (error) {
            const phone = cleanPhoneNumber(rawPhone);
            await sendMessageWhatssap(
                phone,
                '❌ *Error al procesar comprobante*\n\nHubo un problema al recibir tu comprobante.\n\nPor favor intenta enviarlo nuevamente. Si el problema persiste, contacta a administración.'
            );
        }
    }

    private async processMascotaRegistration(phone: string, text: string) {
        const contenido = text.replace(/^\s*mascota\s*/i, '').trim();
        const [nombre, raza, placaRaw, ...extra] = contenido
            .split('/')
            .map((parte) => parte.trim());
        const placaNormalizada = placaRaw?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (!nombre || !raza || !placaRaw || extra.length > 0 || !['si', 'no'].includes(placaNormalizada ?? '')) {
            await sendMessageWhatssap(
                phone,
                '🐕 *Registro de Mascota*\n\nUsa exactamente este formato:\n\n*mascota [Nombre] / [Raza] / [Placa Sí/No]*\n\nEjemplo: *mascota Firulais / Labrador / Sí*\n\nAplican las reglas vigentes de mascotas de tu privada.'
            );
            return;
        }

        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const tienePlaca = placaNormalizada === 'si';
            await createMascota(nombre, raza, tienePlaca, usuario.depto_id, usuario.id, undefined, usuario.condominio_id);
            const petRule = await getCurrentRule(usuario.condominio_id, '2');
            const petReminder = petRule?.texto || 'En áreas comunes debe portar placa de identificación, permanecer con correa y la persona responsable debe recoger sus desechos.';

            await sendMessageWhatssap(
                phone,
                '✅ *Mascota registrada*\n\n🐕 Nombre: ' + nombre + '\n📋 Raza: ' + raza + '\n🏷️ Porta placa: ' + (tienePlaca ? 'Sí' : 'No') + '\n📍 Departamento: ' + usuario.numero_depto + '\n\n📖 *Regla vigente de mascotas:* ' + petReminder.slice(0, 1200)
            );
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al registrar mascota*\n\nHubo un problema. Por favor intenta de nuevo o contacta a administración.'
            );
        }
    }

    private async processVisitaRegistration(phone: string, text: string) {
        const parts = text.trim().split(' ');
        const nombreVisitante = parts[1];
        const placas = parts[2];

        if (!nombreVisitante) {
            await sendMessageWhatssap(
                phone,
                '🚗 *Registro de Visita*\n\nPor favor proporciona el nombre del visitante:\n\nFormato: "visita [Nombre] [Placas]"\n\nEjemplo: "visita Juan Pérez ABC123"\n\nLas placas son opcionales.'
            );
            return;
        }

        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const cajon = await getCajonDisponible(usuario.depto_id);
            if (!cajon) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Cajones no disponibles*\n\nLo siento, todos los cajones de visita están ocupados en este momento.\n\nPor favor espera unos minutos o contacta a seguridad.'
                );
                return;
            }

            await createVisita(nombreVisitante, placas || '', usuario.depto_id, cajon);

            await sendMessageWhatssap(
                phone,
                '✅ *Visita Registrada*\n\n👤 Visitante: ' + nombreVisitante + (placas ? '\n🚗 Placas: ' + placas : '') + '\n🅿️ Cajón asignado: *' + cajon + '*\n\n📍 Departamento: ' + usuario.numero_depto + '\n\n🎫 Por favor informa al guardia el cajón asignado.'
            );
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al registrar visita*\n\nHubo un problema. Por favor intenta de nuevo o contacta a seguridad.'
            );
        }
    }

private async processEventoRegistration(phone: string, text: string) {
    try {
        const usuario = await getUserByPhone(phone);
        if (!usuario) {
            await sendMessageWhatssap(
                phone,
                '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
            );
            return;
        }

        const detalle = text.replace(/^evento\s*/i, '').trim();
        const extended = detalle.match(/^(\d{4}-\d{2}-\d{2})\s+(([01]\d|2[0-3]):[0-5]\d)\s*\/\s*(([01]\d|2[0-3]):[0-5]\d)\s*\/\s*(.+?)\s*\/\s*(\d{1,2})\s*cajones?$/i);
        const simple = detalle.match(/^(\d{4}-\d{2}-\d{2})\s+(([01]\d|2[0-3]):[0-5]\d)\s+(.+?)(?:\s*\/\s*(\d{1,2})\s*cajones?)?$/i);

        if (!extended && !simple) {
            await sendMessageWhatssap(
                phone,
                '🎉 *Solicitud de Evento*\n\nFormato: *evento AAAA-MM-DD HH:MM / HH:MM / Título / N cajones*\n\nEjemplo: *evento 2026-08-29 17:00 / 23:00 / Cumpleaños de Juan / 3 cajones*\n\nAplican las reglas vigentes de eventos de tu privada.'
            );
            return;
        }

        const fechaEvento = (extended?.[1] || simple?.[1])!;
        const horaInicio = (extended?.[2] || simple?.[2])!;
        const horaFin = extended?.[4] || '23:30';
        const titulo = (extended?.[6] || simple?.[4])!.trim();
        const cajonesRequeridos = Number(extended?.[7] || simple?.[5] || 0);
        if (horaFin <= horaInicio || cajonesRequeridos > 20) return sendMessageWhatssap(phone, '❌ Revisa el horario y solicita entre 0 y 20 cajones.');

        // Guardar en la BD pasando una fecha válida en formato DATE
        await createEvento(
        titulo!.trim(),
        fechaEvento!,
        horaInicio, 
        horaFin, 
        usuario.depto_id! as string, 
        usuario.id as string,
        usuario.condominio_id as string,
        cajonesRequeridos
        );
        const eventRule = await getCurrentRule(usuario.condominio_id, '6.2') || await getCurrentRule(usuario.condominio_id, '6');
        const eventReminder = eventRule?.texto || 'Reduce el ruido antes de las 12:00 AM y asegúrate de que tus invitados respeten las instalaciones.';
        await sendMessageWhatssap(
            phone,
            `✅ *Evento registrado*\n\n📌 *Evento:* ${titulo}\n📅 *Fecha:* ${fechaEvento}\n🕐 *Horario:* ${horaInicio} - ${horaFin}\n🚗 *Cajones solicitados:* ${cajonesRequeridos}\n📍 *Departamento:* ${usuario.numero_depto}\n\nAdministración confirmará los cajones específicos.\n\n⚠️ *Regla vigente para eventos:* ${eventReminder.slice(0, 1200)}`
        );
    } catch (error) {
        console.error('Error registrando evento:', error);
        await sendMessageWhatssap(
            phone,
            '❌ *Error al registrar evento*\n\nHubo un problema. Por favor intenta de nuevo.'
        );
    }
}

private async processMyEvents(phone: string) {
    const usuario = await getUserByPhone(phone);
    if (!usuario) return sendMessageWhatssap(phone, '⚠️ Número no registrado.');
    const events = await getUpcomingEventsByUser(usuario.id, usuario.condominio_id);
    if (!events.length) return sendMessageWhatssap(phone, '📅 *Mis eventos*\n\nNo tienes eventos próximos activos.');
    const list = events.map((event) => `• *${String(event.id).slice(0, 8)}* — ${event.fecha_evento} ${String(event.hora_inicio).slice(0, 5)}\n  ${event.titulo}\n  🚗 Solicitados: ${event.cajones_requeridos} · Asignados: ${event.cajones_asignados}`).join('\n\n');
    await sendMessageWhatssap(phone, `📅 *Mis eventos próximos*\n\n${list}\n\nPara cancelar: *cancelar evento FOLIO*\nPara editar: *editar evento FOLIO / AAAA-MM-DD / HH:MM / HH:MM / Título*`);
}

private async processImprovements(phone: string, condominioId: string) {
    const items = await getLatestImprovements(condominioId);
    if (!items.length) return sendMessageWhatssap(phone, '🏗️ *Bitácora de mejoras*\n\nAdministración todavía no ha publicado mejoras terminadas.');
    const summary = items.map((item) => `✅ *${item.titulo}*\n${item.mensaje}\n_${new Date(item.creado_en).toLocaleDateString('es-MX')}_`).join('\n\n');
    await sendMessageWhatssap(phone, `🏗️ *Últimas mejoras del condominio*\n\n${summary}`);
    const latestImage = Array.isArray(items[0].imagenes) ? items[0].imagenes[0] : null;
    if (latestImage) {
        const url = await getFileAccessUrl(latestImage);
        if (url) await sendWhatsAppImage(cleanPhoneNumber(phone), url, items[0].titulo);
    }
}

private async processReadIntent(phone: string, usuario: any, intent: BotIntent) {
        switch (intent) {
            case 'MENU': return this.sendMainMenu(phone, usuario.nombre);
            case 'SALDO': return this.processSaldo(phone, false);
            case 'ESTADO_CUENTA': return this.processSaldo(phone, true);
            case 'DATOS_PAGO': return this.processPaymentDetails(phone, usuario.condominio_id);
            case 'TRANSPARENCIA': return this.processTransparencia(phone);
            case 'OBRAS': return this.processImprovements(phone, usuario.condominio_id);
            case 'MIS_EVENTOS': return this.processMyEvents(phone);
            case 'CAJONES': return this.processCajones(phone);
            case 'VOTACIONES': return this.processAssemblies(phone, usuario.condominio_id);
            case 'REGLAMENTO': return sendMessageWhatssap(phone, await formatCurrentRegulation(usuario.condominio_id) || '📘 El Reglamento todavía no ha sido publicado por la administración.');
            default: return;
        }
    }

private async processPaymentDetails(phone: string, condominioId: string) {
    const payment = await getCondominio(condominioId);
    if (!payment || (!payment.numero_cuenta && !payment.clabe && !payment.numero_tarjeta)) {
        return sendMessageWhatssap(phone, '💳 *Datos para pago*\n\nAdministración todavía no ha publicado una cuenta para depósitos. Comunícate con el comité.');
    }
    const lines = [
        payment.banco ? `🏦 *Banco:* ${payment.banco}` : '',
        payment.titular_cuenta ? `👤 *Titular:* ${payment.titular_cuenta}` : '',
        payment.numero_cuenta ? `🔢 *Cuenta:* ${payment.numero_cuenta}` : '',
        payment.clabe ? `🔐 *CLABE:* ${payment.clabe}` : '',
        payment.numero_tarjeta ? `💳 *Tarjeta:* ${payment.numero_tarjeta.replace(/(\d{4})(?=\d)/g, '$1 ')}` : '',
        payment.instrucciones_pago ? `\n📝 ${payment.instrucciones_pago}` : '',
    ].filter(Boolean).join('\n');
    await sendMessageWhatssap(phone, `💳 *Datos oficiales para realizar tu pago*\n\n${lines}\n\n📸 Después de depositar, envía tu comprobante por este chat.\n⚠️ Verifica que el titular coincida antes de transferir.`);
}

private async processAssemblies(phone: string, condominioId: string) {
    const assemblies = await getOpenAssemblies(condominioId);
    if (!assemblies.length) return sendMessageWhatssap(phone, '🗳️ *Asambleas y votaciones*\n\nNo hay votaciones abiertas en este momento.');
    const messages = assemblies.map((assembly) => {
        const questions = assembly.preguntas.map((question: any) => `*P${question.orden}. ${question.pregunta}*\n${question.opciones.map((option: any) => `  ${option.orden}) ${option.texto}`).join('\n')}`).join('\n\n');
        return `🗳️ *${assembly.titulo}*\nFolio: *${String(assembly.id).slice(0, 8)}*\nCierra: ${new Date(assembly.cierra_en).toLocaleString('es-MX')}\n${assembly.ubicacion ? `Lugar: ${assembly.ubicacion}\n` : ''}${assembly.enlace_virtual ? `Enlace: ${assembly.enlace_virtual}\n` : ''}\n${questions}\n\nResponde: *votar ${String(assembly.id).slice(0, 8)} 1:2, 2:1*`;
    });
    for (const message of messages) await sendMessageWhatssap(phone, message);
}

private async processVote(phone: string, text: string) {
    const usuario = await getUserByPhone(phone);
    if (!usuario) return sendMessageWhatssap(phone, '⚠️ Número no registrado.');
    const match = text.trim().match(/^votar\s+([0-9a-f-]{6,36})\s+(.+)$/i);
    if (!match) return sendMessageWhatssap(phone, 'Formato: *votar FOLIO 1:2, 2:1*\n\nEl primer número es la pregunta y el segundo la opción. Escribe *votaciones* para verlas.');
    const selections = match[2]!.split(',').map((item) => item.trim()).map((item) => {
        const choice = item.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
        return choice ? { pregunta: Number(choice[1]), opcion: Number(choice[2]) } : null;
    });
    if (selections.some((item) => !item) || !selections.length || new Set(selections.map((item) => item!.pregunta)).size !== selections.length) return sendMessageWhatssap(phone, '❌ Revisa el formato. Cada pregunta sólo puede aparecer una vez: *votar FOLIO 1:2, 2:1*');
    try {
        const result = await castAssemblyVotes(match[1]!, usuario.condominio_id, usuario.id, usuario.depto_id, selections as Array<{ pregunta: number; opcion: number }>);
        if (!result) return sendMessageWhatssap(phone, '❌ No encontré una asamblea abierta con ese folio. Escribe *votaciones*.');
        await sendMessageWhatssap(phone, `✅ *Voto registrado*\n\nAsamblea: ${result.asamblea.titulo}\nRespuestas guardadas: ${result.votos}\n\nPuedes cambiar tu selección mientras la votación permanezca abierta.`);
    } catch (error) { await sendMessageWhatssap(phone, `❌ ${error instanceof Error ? error.message : 'No se pudo registrar el voto.'}`); }
}

private async processCancelEvent(phone: string, text: string) {
    const usuario = await getUserByPhone(phone);
    if (!usuario) return sendMessageWhatssap(phone, '⚠️ Número no registrado.');
    const reference = text.replace(/^cancelar evento\s*/i, '').trim();
    if (!reference) return sendMessageWhatssap(phone, 'Formato: *cancelar evento FOLIO*\n\nEscribe *mis eventos* para consultar tus folios.');
    const event = await cancelEventoByUser(reference, usuario.id, usuario.condominio_id);
    if (!event) return sendMessageWhatssap(phone, '❌ No encontré un evento activo con ese folio dentro de tu departamento. Escribe *mis eventos*.');
    await sendMessageWhatssap(phone, `✅ *Evento cancelado*\n\n${event.titulo}\n📅 ${event.fecha_evento}\n\nEl registro se conservará en la bitácora de administración.`);
}

private async processEditEvent(phone: string, text: string) {
    const usuario = await getUserByPhone(phone);
    if (!usuario) return sendMessageWhatssap(phone, '⚠️ Número no registrado.');
    const parts = text.replace(/^editar evento\s*/i, '').split('/').map((part) => part.trim());
    if (parts.length !== 5 && parts.length !== 6) return sendMessageWhatssap(phone, 'Formato: *editar evento FOLIO / AAAA-MM-DD / HH:MM / HH:MM / Título / N cajones*\n\nEl número de cajones es opcional.');
    const [reference, fecha_evento, hora_inicio, hora_fin, titulo, parkingRaw] = parts as [string,string,string,string,string,string?];
    const cajones_requeridos = parkingRaw === undefined ? undefined : Number(parkingRaw.replace(/\s*cajones?\s*/i, ''));
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(fecha_evento) && !Number.isNaN(Date.parse(`${fecha_evento}T00:00:00`));
    const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!validDate || !validTime(hora_inicio) || !validTime(hora_fin) || hora_fin <= hora_inicio || titulo.length < 3 || titulo.length > 150 || (cajones_requeridos !== undefined && (!Number.isInteger(cajones_requeridos) || cajones_requeridos < 0 || cajones_requeridos > 20))) return sendMessageWhatssap(phone, '❌ Revisa la fecha, el título, el horario y solicita entre 0 y 20 cajones.');
    const event = await updateEventoByUser(reference, usuario.id, usuario.condominio_id, { titulo, fecha_evento, hora_inicio, hora_fin, ...(cajones_requeridos === undefined ? {} : { cajones_requeridos }) });
    if (!event) return sendMessageWhatssap(phone, '❌ No encontré un evento activo con ese folio dentro de tu departamento. Escribe *mis eventos*.');
    await sendMessageWhatssap(phone, `✅ *Evento actualizado*\n\n📌 ${event.titulo}\n📅 ${event.fecha_evento}\n🕐 ${event.hora_inicio} - ${event.hora_fin}\n\nSe volverá a programar el recordatorio conforme al Reglamento vigente.`);
}

    private async processTransparencia(phone: string) {
        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const estado = await getPublishedGeneralState(usuario.condominio_id);
            if (!estado) {
                await sendMessageWhatssap(phone, '📊 *Estado financiero general*\n\nAdministración todavía no ha publicado un estado financiero para consulta de residentes.');
                return;
            }

            const mensaje =
                '📊 *TRANSPARENCIA FINANCIERA DEL CONDOMINIO*\n\n' +
                `🗓️ *Periodo:* ${estado.periodo}\n` +
                `🟢 *Ingresos:* $${Number(estado.ingresos).toFixed(2)} MXN\n` +
                `🔴 *Gastos:* $${Number(estado.gastos).toFixed(2)} MXN\n` +
                `🏦 *Fondo disponible:* $${Number(estado.fondo_disponible).toFixed(2)} MXN\n` +
                `📋 *Adeudo acumulado de la privada:* $${Number(estado.morosidad).toFixed(2)} MXN\n` +
                `✅ *Departamentos al corriente:* ${estado.departamentos_corriente} de ${estado.total_departamentos}\n\n` +
                '_Este reporte es agregado: no muestra nombres, departamentos ni adeudos individuales._';

            await sendMessageWhatssap(phone, mensaje);
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al obtener información financiera*\n\nHubo un problema. Por favor intenta de nuevo más tarde.'
            );
        }
    }

    private async processOnboarding(phone: string, text: string): Promise<boolean> {
        const normalized = text.trim();
        const lower = normalized.toLowerCase();
        const invitationMatch = normalized.match(/^alta\s+([a-z0-9-]+)$/i);

        if (lower === 'alta') {
            await sendMessageWhatssap(phone, '🏢 *Registro de residente*\n\nEnvía *ALTA* seguido del código que te compartió el comité.\n\nEjemplo: *ALTA CRATER-A1B2C3*');
            return true;
        }

        if (invitationMatch) {
            const invitation = await validateInvitationCode(invitationMatch[1]!);
            if (!invitation) {
                await sendMessageWhatssap(phone, '❌ El código no existe, venció o alcanzó su límite de registros. Revisa el mensaje o solicita uno nuevo al comité.');
                return true;
            }
            if (invitation.condominio_estatus !== 'ACTIVO') {
                await sendMessageWhatssap(phone, '⚠️ El servicio para este condominio se encuentra suspendido. Contacta a la administración.');
                return true;
            }
            await saveWhatsAppSession(phone, invitation.condominio_id, 'REGISTRO_NOMBRE', {}, invitation.id);
            await sendMessageWhatssap(phone, `✅ Código válido para *${invitation.condominio_nombre}*.\n\nPor favor escribe tu *nombre completo*.`);
            return true;
        }

        const session = await getWhatsAppSession(phone);
        if (session?.condominio_id && await this.rejectSuspendedCondominium(phone, session.condominio_id)) return true;
        if (session?.estado === 'REGISTRO_NOMBRE') {
            const name = normalized.replace(/\s+/g, ' ');
            if (name.length < 3 || name.length > 120 || /^\d+$/.test(name)) {
                await sendMessageWhatssap(phone, '⚠️ Escribe tu nombre completo, por ejemplo: *Juan Pérez López*.');
                return true;
            }
            await saveWhatsAppSession(phone, session.condominio_id, 'REGISTRO_DEPARTAMENTO', { nombre: name }, session.codigo_invitacion_id);
            await sendMessageWhatssap(phone, `Gracias, *${name}*.\n\nAhora escribe tu *departamento, casa o lote*.\nEjemplo: *A-101* o *Casa 24*.`);
            return true;
        }

        if (session?.estado === 'REGISTRO_DEPARTAMENTO') {
            const department = normalized.replace(/\s+/g, ' ');
            if (!department || department.length > 20) {
                await sendMessageWhatssap(phone, '⚠️ El departamento es obligatorio y debe tener máximo 20 caracteres. Ejemplo: *Casa 24*.');
                return true;
            }
            try {
                await createRegistrationRequest(phone, department);
                await sendMessageWhatssap(phone, `✅ *Solicitud enviada*\n\nEl comité revisará tus datos. Te avisaremos por este medio cuando el registro sea aprobado.\n\n📍 Departamento: ${department}`);
            } catch (error) {
                await sendMessageWhatssap(phone, `⚠️ ${error instanceof Error ? error.message : 'No se pudo crear la solicitud.'}`);
            }
            return true;
        }

        if (session?.estado === 'SELECCION_CONDOMINIO') {
            const options = Array.isArray(session.datos?.opciones) ? session.datos.opciones : [];
            const selection = Number(normalized);
            const selected = Number.isInteger(selection) ? options[selection - 1] : null;
            if (!selected?.condominio_id) {
                await sendMessageWhatssap(phone, '⚠️ Responde únicamente con el número de la privada que deseas consultar.');
                return true;
            }
            await saveWhatsAppSession(phone, selected.condominio_id, 'ACTIVA', {});
            const user = await getUserByPhone(phone);
            await sendMessageWhatssap(phone, `✅ Privada activa: *${selected.condominio_nombre}*.`);
            if (user) await this.sendMainMenu(phone, user.nombre);
            return true;
        }

        if (['cambiar privada', 'privadas', 'condominio'].includes(lower)) {
            const memberships = await getPhoneMemberships(phone);
            if (!memberships.length) {
                await sendMessageWhatssap(phone, 'No tienes privadas registradas. Si recibiste una invitación, envía *ALTA* seguido de tu código.');
            } else if (memberships.length === 1) {
                await saveWhatsAppSession(phone, memberships[0].condominio_id, 'ACTIVA', {});
                await sendMessageWhatssap(phone, `🏢 Tu privada activa es *${memberships[0].condominio_nombre}*.`);
            } else {
                await saveWhatsAppSession(phone, null, 'SELECCION_CONDOMINIO', { opciones: memberships });
                const options = memberships.map((membership, index) => `${index + 1}. ${membership.condominio_nombre}`).join('\n');
                await sendMessageWhatssap(phone, `🏢 *Selecciona una privada*\n\n${options}\n\nResponde con el número correspondiente.`);
            }
            return true;
        }

        if (!session) {
            const memberships = await getPhoneMemberships(phone);
            if (memberships.length > 1) {
                await saveWhatsAppSession(phone, null, 'SELECCION_CONDOMINIO', { opciones: memberships });
                const options = memberships.map((membership, index) => `${index + 1}. ${membership.condominio_nombre}`).join('\n');
                await sendMessageWhatssap(phone, `🏢 Tienes acceso a más de una privada:\n\n${options}\n\nResponde con el número que deseas consultar.`);
                return true;
            }
            if (memberships.length === 1) await saveWhatsAppSession(phone, memberships[0].condominio_id, 'ACTIVA', {});
        }
        return false;
    }

    private async processSaldo(phone: string, sendPdf: boolean) {
        const usuario = await getUserByPhone(phone);
        if (!usuario) return;
        await ensureMonthlyChargesDue(usuario.condominio_id);
        const estado = await getAccountStatement(usuario.depto_id);
        const resumen =
            `💳 *Estado de cuenta personal*\n\n` +
            `🏠 Departamento: ${usuario.numero_depto}\n` +
            `🧾 Cuotas pendientes: $${Number(estado.total_cargos).toFixed(2)} MXN\n` +
            `⚠️ Multas pendientes: $${Number(estado.total_multas).toFixed(2)} MXN\n` +
            `💰 *Total acumulado: $${Number(estado.saldo_total).toFixed(2)} MXN*\n` +
            (Number(estado.pagos_revision) > 0 ? `\n⏳ Comprobantes en revisión: $${Number(estado.pagos_revision).toFixed(2)} MXN` : '');
        await sendMessageWhatssap(phone, resumen);
        if (!sendPdf) return;

        const filename = `estado-cuenta-${usuario.numero_depto}-${Date.now()}.pdf`;
        const lines = [
            'ESTADO DE CUENTA PERSONAL',
            `Departamento: ${usuario.numero_depto}`,
            `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
            `Cuotas pendientes: $${Number(estado.total_cargos).toFixed(2)} MXN`,
            `Multas pendientes: $${Number(estado.total_multas).toFixed(2)} MXN`,
            `Total acumulado: $${Number(estado.saldo_total).toFixed(2)} MXN`,
            '',
            ...estado.cargos.filter((cargo) => cargo.estado === 'PENDIENTE').slice(0, 15)
                .map((cargo) => `${cargo.periodo} - ${cargo.concepto}: $${Number(cargo.monto).toFixed(2)}`),
        ];
        const filePath = await createStatementPdf(lines, filename);
        const url = `${config.publicBaseUrl.replace(/\/$/, '')}/${filePath}`;
        await sendWhatsAppDocument(phone, url, filename, 'Tu estado de cuenta personal');
    }

    private async processCajones(phone: string) {
        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const cajones = await getCajonesDisponibles(usuario.depto_id);

            if (cajones.length === 0) {
                await sendMessageWhatssap(
                    phone,
                    '🅿️ *Cajones de Estacionamiento*\n\n⚠️ No hay cajones disponibles en este momento.\n\nPor favor espera unos minutos o contacta a seguridad.'
                );
                return;
            }

            let mensaje = '🅿️ *Cajones Disponibles*\n\n';
            cajones.forEach((cajon, index) => {
                mensaje += `${index + 1}. 🟢 ${cajon.codigo_cajon} (${cajon.tipo})\n`;
            });
            mensaje += '\n💡 Para apartar un cajón, envía: "apartar [Cajón] [Placas] [Visitante]"\nEjemplo: "apartar EV-01 ABC-123 Juan Pérez"';

            await sendMessageWhatssap(phone, mensaje);
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al consultar cajones*\n\nHubo un problema. Por favor intenta de nuevo.'
            );
        }
    }

    private async processApartarCajon(phone: string, text: string) {
        const parts = text.trim().split(' ');
        const codigoCajon = parts[1];
        const placas = parts[2];
        const nombreVisitante = parts.slice(3).join(' ');

        if (!codigoCajon || !placas || !nombreVisitante) {
            await sendMessageWhatssap(
                phone,
                '🅿️ *Apartar Cajón*\n\nPor favor proporciona la información completa:\n\nFormato: "apartar [Cajón] [Placas] [Visitante]"\n\nEjemplo: "apartar EV-01 ABC-123 Juan Pérez"'
            );
            return;
        }

        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const cajon = await getCajonByCodigo(codigoCajon, usuario.depto_id);
            if (!cajon) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Cajón no encontrado*\n\nEl cajón ' + codigoCajon + ' no existe en el sistema.\n\nEnvía "cajones" para ver los disponibles.'
                );
                return;
            }

            if (cajon.estatus !== 'DISPONIBLE') {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Cajón no disponible*\n\nEl cajón ' + codigoCajon + ' está ' + cajon.estatus + '.\n\nEnvía "cajones" para ver los disponibles.'
                );
                return;
            }

            const reserva = await createReserva(cajon.id, usuario.id, usuario.depto_id, placas, nombreVisitante);
            if (!reserva) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Error al reservar*\n\nNo se pudo apartar el cajón. Posiblemente fue ocupado por otro usuario.\n\nPor favor intenta con otro cajón.'
                );
                return;
            }

            await sendMessageWhatssap(
                phone,
                '✅ *Cajón Reservado*\n\n🅿️ Cajón: ' + codigoCajon + '\n🚗 Placas: ' + placas + '\n👤 Visitante: ' + nombreVisitante + '\n\n📍 Departamento: ' + usuario.numero_depto + '\n\n🎫 Por favor informa al guardia el cajón asignado. ¡Bienvenido!'
            );
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al apartar cajón*\n\nHubo un problema. Por favor intenta de nuevo.'
            );
        }
    }

    private async processLiberarCajon(phone: string, text: string) {
        try {
            const usuario = await getUserByPhone(phone);
            if (!usuario) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Número no registrado*\n\nLo siento, pero tu número no está en nuestro sistema.'
                );
                return;
            }

            const parts = text.trim().split(' ');
            const codigoCajon = parts[1];

            // Verificar si el usuario tiene una reserva activa
            const reserva = await getReservaActivaByUsuario(usuario.id);
            if (!reserva) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Sin reserva activa*\n\nNo tienes ninguna reserva activa en este momento.'
                );
                return;
            }

            const liberada = await liberarReserva(reserva.id);
            if (!liberada) {
                await sendMessageWhatssap(
                    phone,
                    '⚠️ *Error al liberar*\n\nNo se pudo liberar el cajón. Por favor contacta a seguridad.'
                );
                return;
            }

            await sendMessageWhatssap(
                phone,
                '✅ *Cajón Liberado*\n\n🅿️ El cajón ' + reserva.codigo_cajon + ' ha sido liberado correctamente.\n\n📍 Departamento: ' + usuario.numero_depto + '\n\n¡Gracias por tu visita! 👋'
            );
        } catch (error) {
            await sendMessageWhatssap(
                phone,
                '❌ *Error al liberar cajón*\n\nHubo un problema. Por favor intenta de nuevo.'
            );
        }
    }

    private async rejectSuspendedCondominium(phone: string, condominioId: string) {
        const status = await getCondominioStatus(condominioId).catch(() => null);
        if (status === 'ACTIVO') return false;
        await sendMessageWhatssap(phone, '⚠️ El servicio para este condominio se encuentra suspendido. Contacta a la administración.');
        return true;
    }
}


