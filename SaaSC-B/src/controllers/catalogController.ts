import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { listRegulationArticles } from '../repositories/catalogRepository.js';
export async function getRegulationArticlesHandler(req:AuthRequest,res:Response){try{return res.json(await listRegulationArticles(req.user!.condominio_id));}catch(error){console.error('Error consultando catálogo:',error);return res.status(500).json({error:'No fue posible consultar el catálogo del Reglamento.'});}}
