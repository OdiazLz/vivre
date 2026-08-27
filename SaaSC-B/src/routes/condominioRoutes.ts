import { Router } from 'express';
import { getCondominioHandler, updateCondominioHandler } from '../controllers/condominioController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/configuracion', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'), getCondominioHandler);
router.put('/configuracion', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), updateCondominioHandler);

export default router;
