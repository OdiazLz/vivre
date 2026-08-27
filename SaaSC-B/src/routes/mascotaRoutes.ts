import { Router } from 'express';
import { getMascotasHandler, createMascotaHandler, deleteMascotaHandler } from '../controllers/mascotaController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/mascotas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL'), getMascotasHandler);
router.post('/mascotas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), createMascotaHandler);
router.delete('/mascotas/:id', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), deleteMascotaHandler);

export default router;
