import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-change-me'),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean),
  metaAppSecret: process.env.META_APP_SECRET || '',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  },
  superadmin: {
    email: process.env.SUPERADMIN_EMAIL || '',
    password: process.env.SUPERADMIN_PASSWORD || '',
  },
  
  database: {
    url: process.env.DATABASE_URL || '',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    maxConnections: Math.max(2, Math.min(50, Number(process.env.DB_POOL_MAX) || 10)),
  },
  
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '',
    publicNumber: process.env.WHATSAPP_PUBLIC_NUMBER || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    paymentProofTemplate: process.env.WHATSAPP_PAYMENT_PROOF_TEMPLATE || '',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_MX',
    apiVersion: 'v26.0',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    endpoint: process.env.AWS_ENDPOINT || '',
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === 'true',
  },
} as const;

export function validateProductionConfig() {
  if (config.nodeEnv !== 'production') return;
  const missing = [
    ['DATABASE_URL', config.database.url], ['JWT_SECRET', config.jwtSecret],
    ['META_APP_SECRET', config.metaAppSecret], ['WHATSAPP_TOKEN', config.whatsapp.token],
    ['PHONE_NUMBER_ID', config.whatsapp.phoneNumberId], ['AWS_S3_BUCKET', config.aws.s3Bucket],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Configuración productiva incompleta: ${missing.join(', ')}`);
  if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET debe contener al menos 32 caracteres en producción.');
  if (!config.publicBaseUrl.startsWith('https://')) throw new Error('PUBLIC_BASE_URL debe usar HTTPS en producción.');
}

export type Config = typeof config;
