import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  createRegulationHandler, deleteRegulationHandler, duplicateRegulationHandler, extractRegulationHandler,
  getEditableRegulationHandler, getRegulationHandler, listRegulationsHandler, publishRegulationHandler,
  updateRegulationHandler,
} from '../controllers/regulationController.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});
const extractionLimiter=rateLimit({windowMs:60*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Límite de lecturas automáticas alcanzado. Intenta más tarde.'}});
router.use(authenticateToken,authorizeRoles('ADMINISTRADOR','PRESIDENTE'));
router.get('/reglamentos',listRegulationsHandler);
router.get('/reglamentos/editor',getEditableRegulationHandler);
router.get('/reglamentos/:id',getRegulationHandler);
router.post('/reglamentos',createRegulationHandler);
router.put('/reglamentos/:id',updateRegulationHandler);
router.post('/reglamentos/duplicar-vigente',duplicateRegulationHandler);
router.post('/reglamentos/:id/publicar',publishRegulationHandler);
router.delete('/reglamentos/:id',deleteRegulationHandler);
router.post('/reglamentos-extraer',extractionLimiter,upload.single('archivo'),extractRegulationHandler);
export default router;
