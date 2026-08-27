import axios from 'axios';
import { config } from '../config/index.js';
import type { WhatsAppButtonOption } from '../types/whatsapp.js';

export async function sendMessageWhatssap(
    to: string,
    texto: string
) {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: {
                    body: texto
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${config.whatsapp.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Response:', response.data);

        console.log(`✅ WhatsApp enviado a ${to}`);

        return response.data;

    } catch (error: unknown) {

        if (axios.isAxiosError(error)) {
            console.error('❌ META STATUS:', error.response?.status);

            console.error(
                '❌ META ERROR:',
                JSON.stringify(error.response?.data, null, 2)
            );
        } else {
            console.error('❌ Error desconocido:', error);
        }

        throw error;
    }
}

export async function sendWhatsAppButton(
    to: string,
    bodyText: string,
    buttons: WhatsAppButtonOption[],
    footerText?: string
): Promise<void> {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: bodyText
            },
            footer: footerText ? { text: footerText } : undefined,
            action: {
                buttons: buttons.map(btn => ({
                    type: 'reply',
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };

    try {
        await axios.post(
        `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`,
        payload,
        {
            headers: {
            Authorization: `Bearer ${config.whatsapp.token}`,
            'Content-Type': 'application/json'
            }
        }
        );
        console.log(`WhatsApp buttons sent to ${to}`);
    } catch (error) {
        console.error('Error enviando botones interactivas:', error);
        throw error;
    }
    
}

export async function sendRawMessage(messageData: any): Promise<void> {
    try {
        await axios.post(
            `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`,
            messageData,
            {
                headers: {
                    Authorization: `Bearer ${config.whatsapp.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('WhatsApp raw message sent');
    } catch (error) {
        console.error('Error enviando mensaje raw:', error);
        throw error;
    }
}

export async function sendWhatsAppDocument(to: string, documentUrl: string, filename: string, caption: string) {
    return sendRawMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { link: documentUrl, filename, caption }
    });
}

export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string) {
    return sendRawMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption }
    });
}

export async function sendWhatsAppTemplate(to: string, templateName: string, parameters: string[], languageCode = 'es_MX') {
    return sendRawMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
            components: [{
                type: 'body',
                parameters: parameters.map((text) => ({ type: 'text', text })),
            }],
        },
    });
}
