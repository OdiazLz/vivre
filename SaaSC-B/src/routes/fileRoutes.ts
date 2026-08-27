import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadFileHandler } from '../controllers/fileController.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Límite de archivos alcanzado. Intenta nuevamente más tarde.' } });
router.post('/archivos', uploadLimiter, authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'MANTENIMIENTO'), upload.single('archivo'), uploadFileHandler);
export default router;
