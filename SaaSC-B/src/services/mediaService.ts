import axios from 'axios';
import { config } from '../config/index.js';
import { storeFile } from './storageService.js';

export async function downloadWhatssapMedia(mediaId: string, fileName: string, condominioId: string): Promise<string> {
    const mediaUrlResponse = await axios.get(`https://graph.facebook.com/${config.whatsapp.apiVersion}/${mediaId}`, {
        headers: { Authorization: `Bearer ${config.whatsapp.token}` }
    });

    const downloadUrl = mediaUrlResponse.data.url;

    const response = await axios.get(downloadUrl, {
        headers: { Authorization: `Bearer ${config.whatsapp.token}` },
        responseType: 'arraybuffer',
        maxContentLength: 8 * 1024 * 1024,
        maxBodyLength: 8 * 1024 * 1024,
    });
    const stored = await storeFile(Buffer.from(response.data), condominioId, 'comprobantes', fileName, true);
    return stored.key;
}
