import { Router } from 'express';
import { getEventosHandler, createEventoHandler, updateEventoHandler, cancelEventoHandler, getEventParkingOptionsHandler } from '../controllers/eventoController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/eventos', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL'), getEventosHandler);
router.get('/eventos/cajones-disponibles', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), getEventParkingOptionsHandler);
router.post('/eventos', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), createEventoHandler);
router.put('/eventos/:id', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), updateEventoHandler);
router.patch('/eventos/:id/cancelar', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), cancelEventoHandler);

export default router;
