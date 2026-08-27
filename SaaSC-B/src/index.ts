import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { WhatsappController } from './controllers/whatsappController.js';
import { BotService } from './services/botService.js';
import { CronService } from './services/cronService.js';
import { config, validateProductionConfig } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import { createWhatsappRoutes } from './routes/whatsappRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import broadcastRoutes from './routes/broadcastRoutes.js';
import incidenciaRoutes from './routes/incidenciaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import condominioRoutes from './routes/condominioRoutes.js';
import authRoutes from './routes/authRoutes.js';
import mascotaRoutes from './routes/mascotaRoutes.js';
import visitaRoutes from './routes/visitaRoutes.js';
import eventoRoutes from './routes/eventoRoutes.js';
import multaRoutes from './routes/multaRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import cajonRoutes from './routes/cajonRoutes.js';
import managementRoutes from './routes/managementRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import assemblyRoutes from './routes/assemblyRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import regulationRoutes from './routes/regulationRoutes.js';
import { bootstrapSuperAdmin } from './services/superAdminBootstrap.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
validateProductionConfig();
app.disable('x-powered-by');
if (config.nodeEnv === 'production') app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

const isDev = config.nodeEnv === 'development';

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (isDev) {
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    } else if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen ${origin} no permitido por CORS.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '1mb', verify: (req, _res, buffer) => { (req as import('./middleware/whatsappSignature.js').RawBodyRequest).rawBody = Buffer.from(buffer); } }));
app.use(requestLogger);
app.use(auditMiddleware);

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Espera 15 minutos.' } });
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

const botService = new BotService();
const whatsappController = new WhatsappController(botService);
const cronService = new CronService();
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); return res.status(200).json({ status: 'ok', service: 'Vivre API' }); }
  catch { return res.status(503).json({ status: 'unavailable', service: 'Vivre API' }); }
});

app.use('/', createWhatsappRoutes(whatsappController));
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api', catalogRoutes);
app.use('/api', regulationRoutes);
app.use('/api', paymentRoutes);
app.use('/api', condominioRoutes);
app.use('/api', mascotaRoutes);
app.use('/api', visitaRoutes);
app.use('/api', eventoRoutes);
app.use('/api', multaRoutes);
app.use('/api', metricsRoutes);
app.use('/api', cajonRoutes);
app.use('/api', managementRoutes);
app.use('/api', registrationRoutes);
app.use('/api', fileRoutes);
app.use('/api', assemblyRoutes);
app.use('/api/avisos', broadcastRoutes);
app.use('/api/incidencias', incidenciaRoutes);
app.use('/api', userRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await bootstrapSuperAdmin();
const server = app.listen(config.port, () => {
  console.log(`Vivre API is running on port ${config.port}`);
  cronService.start();
  console.log('CronService started - Silence alerts enabled at 11:30 PM');
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: cerrando Vivre API de forma segura.`);
  cronService.stop();
  server.close(async () => {
    await pool.end().catch((error) => console.error('Error al cerrar PostgreSQL:', error));
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
