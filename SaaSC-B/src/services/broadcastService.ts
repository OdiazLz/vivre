// src/services/broadcastService.ts
import { getAllActiveUsers } from '../repositories/userRepository.js';
import { sendMessageWhatssap, sendWhatsAppImage } from './whatsappService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { getFileAccessUrl } from './storageService.js';
import { completeBroadcast, createPendingBroadcast, listLatestImprovements } from '../repositories/broadcastRepository.js';

export async function getLatestImprovements(condominioId: string, limit = 5) {
  return listLatestImprovements(condominioId,limit);
}

export class BroadcastService {
  public async sendMassNotice(condominioId: string, titulo: string, mensaje: string, imagenes: string[] = [], tipo = 'AVISO') {

    console.log('Iniciando envío masivo de avisos...');
    const usuarios = await getAllActiveUsers(condominioId);
    console.log('Usuarios encontrados:', usuarios.length);

    if (!usuarios || usuarios.length === 0) {
      throw new Error('No hay usuarios activos registrados para notificar.');
    }

    const comunicado = await createPendingBroadcast(condominioId,titulo,mensaje,tipo,imagenes);
    const formatoMensaje = `${tipo === 'MEJORA' ? '🏗️ *MEJORA DEL CONDOMINIO*' : '📢 *AVISO DE ADMINISTRACIÓN*'}\n\n📌 *${titulo}*\n\n${mensaje}\n\n_Este es un mensaje automático del residencial._`;

    let enviados = 0;
    let fallidos = 0;

    for (const usuario of usuarios) {
      try {
        const cleanPhone = cleanPhoneNumber(usuario.telefono_whatsapp);
        await sendMessageWhatssap(cleanPhone, formatoMensaje);
        for (const imagen of imagenes) {
          const signedImage = await getFileAccessUrl(imagen);
          if (signedImage) await sendWhatsAppImage(cleanPhone, signedImage, titulo);
        }
        enviados++;

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error enviando aviso a ${usuario.telefono_whatsapp}:`, error);
        fallidos++;
      }
    }

    await completeBroadcast(comunicado.id,enviados,fallidos);
    return {
      comunicado: comunicado.id,
      total: usuarios.length,
      enviados,
      fallidos
    };
  }
}
