import { Router } from 'express';
import { getRegulationArticlesHandler } from '../controllers/catalogController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
const router=Router(); router.use(authenticateToken); router.get('/catalogos/articulos-reglamento',getRegulationArticlesHandler); export default router;
