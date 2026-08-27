import { Router } from 'express';
import type { WhatsappController } from '../controllers/whatsappController.js';
import { verifyWhatsAppSignature } from '../middleware/whatsappSignature.js';

export function createWhatsappRoutes(whatsappController: WhatsappController): Router {
    const router = Router();

    router.get('/webhook', (req, res) => whatsappController.verifyWebhook(req, res));
    router.post('/webhook', verifyWhatsAppSignature, (req, res) => whatsappController.handleWebhook(req, res));

    return router;
}
