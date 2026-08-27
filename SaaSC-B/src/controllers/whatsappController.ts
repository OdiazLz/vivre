import type { Request, Response } from 'express';
import { BotService } from '../services/botService.js';
import { cleanPhoneNumber } from '../utils/phone.js';
import { config } from '../config/index.js';

export class WhatsappController {
    constructor(private botService: BotService) {}

    public verifyWebhook(req: Request, res: Response): void {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        res.status(200).send(challenge);
        } else {
        res.sendStatus(403);
        }
    }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
          const rawFrom = value?.contacts?.[0]?.wa_id || message.from;
          const cleanFrom = cleanPhoneNumber(rawFrom);
          const type = message.type;

          if (type === 'text') {
            const textBody = message.text.body;
            await this.botService.processIncomingMessage(cleanFrom, textBody);
          }
          else if (type === 'interactive') {
            const buttonId = message.interactive?.button_reply?.id;
            if (buttonId) {
              await this.botService.processInteractiveReply(cleanFrom, buttonId);
            }
          }
          else if (type === 'image' || type === 'document') {
            const mediaID = type === 'image' ? message.image.id : message.document.id;
            const mimeType = type === 'image' ? message.image.mime_type : message.document.mime_type;
            
            const ext = mimeType.includes('pdf') ? 'pdf' : (mimeType.split('/')[1] || 'jpg');
            const filename = `comprobante_${cleanFrom}_${Date.now()}.${ext}`;
            
            await this.botService.processIncomingPayment(cleanFrom, mediaID, filename);
          }
        }

        res.status(200).send('EVENT_RECEIVED');
      } else {
        res.sendStatus(404);
      }
    } catch (error) {
      res.status(200).send('EVENT_RECEIVED');
    }
  }
}