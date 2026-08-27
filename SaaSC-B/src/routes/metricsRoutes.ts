import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getRecaudacionHandler } from '../controllers/metricsController.js';

const router = Router();

router.get('/metrics/recaudacion', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL'), getRecaudacionHandler);

export default router;
