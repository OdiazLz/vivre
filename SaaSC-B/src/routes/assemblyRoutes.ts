import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { createAssemblyHandler, getAssembliesHandler, getAssemblyDetailHandler, updateAssemblyStatusHandler } from '../controllers/assemblyController.js';

const router = Router();
router.use(authenticateToken);
router.get('/asambleas', authorizeRoles('ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL'), getAssembliesHandler);
router.get('/asambleas/:id', authorizeRoles('ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL'), getAssemblyDetailHandler);
router.post('/asambleas', authorizeRoles('ADMINISTRADOR','PRESIDENTE','SECRETARIO'), createAssemblyHandler);
router.patch('/asambleas/:id/estatus', authorizeRoles('ADMINISTRADOR','PRESIDENTE','SECRETARIO'), updateAssemblyStatusHandler);
export default router;
