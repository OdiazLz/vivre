import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';

export interface RawBodyRequest extends Request { rawBody?: Buffer }

export function verifyWhatsAppSignature(req: RawBodyRequest, res: Response, next: NextFunction) {
  if (!config.metaAppSecret) {
    if (config.nodeEnv === 'production') return res.status(503).json({ error: 'Verificación de webhook no configurada.' });
    return next();
  }
  const received = req.header('x-hub-signature-256');
  if (!received || !req.rawBody) return res.status(401).json({ error: 'Firma de webhook ausente.' });
  const expected = `sha256=${createHmac('sha256', config.metaAppSecret).update(req.rawBody).digest('hex')}`;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return res.status(401).json({ error: 'Firma de webhook inválida.' });
  next();
}
