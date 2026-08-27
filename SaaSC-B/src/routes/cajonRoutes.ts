import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { 
  getCajonesHandler, 
  createCajonHandler, 
  updateCajonHandler, 
  deleteCajonHandler,
  getReservasActivasHandler,
  getParkingMonitorHandler,
  liberarReservaHandler
} from '../controllers/cajonController.js';

const router = Router();

// Configuración de cajones (protegido con JWT)
router.get('/configuracion/cajones', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL', 'SEGURIDAD'), getCajonesHandler);
router.post('/configuracion/cajones', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), createCajonHandler);
router.patch('/configuracion/cajones/:id', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), updateCajonHandler);
router.delete('/configuracion/cajones/:id', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE'), deleteCajonHandler);

// Reservas (protegido con JWT)
router.get('/cajones/reservas/activas', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL', 'SEGURIDAD'), getReservasActivasHandler);
router.get('/cajones/monitor', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'VOCAL', 'SEGURIDAD'), getParkingMonitorHandler);
router.post('/cajones/reservas/:id/liberar', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'SEGURIDAD'), liberarReservaHandler);

export default router;
