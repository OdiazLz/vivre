import { Router } from 'express';
import { getUsersHandler, getDepartamentosHandler, createUserHandler, updateUserHandler, deleteUserHandler, updateAccesoPortonHandler, importUsersHandler } from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

// Usuarios / Residentes
router.get('/usuarios', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL'), getUsersHandler);
router.post('/usuarios', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), createUserHandler);
router.post('/usuarios/importar', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), importUsersHandler);
router.put('/usuarios/:id', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'), updateUserHandler);
router.delete('/usuarios/:id', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), deleteUserHandler);
router.patch('/usuarios/:id/acceso', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SEGURIDAD'), updateAccesoPortonHandler);
router.get('/departamentos', authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'), getDepartamentosHandler);

export default router;
