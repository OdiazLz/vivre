import { Router } from 'express';
import { sendBroadcastHandler, getBroadcastsHandler, deleteBroadcastHandler } from '../controllers/broadcastController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.post('/masivos', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'MANTENIMIENTO'), sendBroadcastHandler);
router.get('/comunicados', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'MANTENIMIENTO'), getBroadcastsHandler);
router.delete('/comunicados/:id', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), deleteBroadcastHandler);

export default router;
