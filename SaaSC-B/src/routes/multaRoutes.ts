import { Router } from 'express';
import { getMultasHandler, createMultaHandler, marcarMultaPagadaHandler } from '../controllers/multaController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/multas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL'), getMultasHandler);
router.post('/multas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), createMultaHandler);
router.patch('/multas/:id/pagar', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'), marcarMultaPagadaHandler);

export default router;
