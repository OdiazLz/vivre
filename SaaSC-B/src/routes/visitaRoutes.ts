import { Router } from 'express';
import { getVisitasHandler, createVisitaHandler, marcarSalidaVisitaHandler } from '../controllers/visitaController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/visitas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL', 'SEGURIDAD'), getVisitasHandler);
router.post('/visitas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'SEGURIDAD'), createVisitaHandler);
router.patch('/visitas/:id/salida', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'SEGURIDAD'), marcarSalidaVisitaHandler);

export default router;
