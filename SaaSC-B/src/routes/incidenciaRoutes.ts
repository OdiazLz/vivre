import { Router } from 'express';
import { getIncidenciasHandler, updateIncidenciaStatusHandler, createIncidenciaHandler, deleteIncidenciaHandler } from '../controllers/incidenciaController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL', 'MANTENIMIENTO'), getIncidenciasHandler);
router.post('/', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'MANTENIMIENTO'), createIncidenciaHandler);
router.patch('/:id/estatus', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'MANTENIMIENTO'), updateIncidenciaStatusHandler);
router.delete('/:id', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), deleteIncidenciaHandler);

export default router;
