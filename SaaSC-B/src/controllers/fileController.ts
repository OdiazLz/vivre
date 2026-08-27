import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { createFileRecord } from '../repositories/fileRepository.js';
import { getFileAccessUrl, storeFile } from '../services/storageService.js';

const CATEGORIES = new Set(['mascotas', 'multas', 'incidencias', 'comunicados', 'gastos', 'reglamentos']);

export async function uploadFileHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo.' });
    const category = String(req.body.categoria || '');
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Categoría de archivo inválida.' });
    const stored = await storeFile(req.file.buffer, req.user!.condominio_id, category, req.file.originalname, category === 'gastos' || category === 'reglamentos');
    const result = await createFileRecord({condominioId:req.user!.condominio_id,key:stored.key,originalName:req.file.originalname,mime:stored.mime,size:req.file.size,category,storage:stored.storage,uploadedBy:req.user!.admin_id});
    return res.status(201).json({ id: result.id, archivo_key: stored.key, url: await getFileAccessUrl(stored.key), mime_type: stored.mime });
  } catch (error: any) { return res.status(400).json({ error: error.message || 'No se pudo guardar el archivo.' }); }
}
