import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { createCondominiumHandler, listCondominiumAdministratorsHandler, listCondominiumsHandler, resetAdministratorPasswordAsSuperAdminHandler, updateCondominiumStatusHandler } from '../controllers/superAdminController.js';

const router = Router();
router.use(authenticateToken, authorizeRoles('SUPERADMIN'));
router.get('/condominios', listCondominiumsHandler);
router.post('/condominios', createCondominiumHandler);
router.get('/condominios/:id/administradores', listCondominiumAdministratorsHandler);
router.patch('/condominios/:id/estatus', updateCondominiumStatusHandler);
router.patch('/administradores/:id/password', resetAdministratorPasswordAsSuperAdminHandler);
export default router;
