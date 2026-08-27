import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import {
  createRegulationDraft, deleteRegulationDraft, duplicateCurrentRegulation, getEditableRegulation,
  getRegulation, listRegulations, publishRegulation, updateRegulationDraft,
  type RegulationDraftInput,
} from '../repositories/regulationRepository.js';
import { extractRegulationFromFile } from '../services/regulationExtractionService.js';
import { createFileRecord } from '../repositories/fileRepository.js';
import { isFileKeyOwnedByCondominium, storeFile } from '../services/storageService.js';

function cleanText(value: unknown, max: number) { return String(value ?? '').trim().slice(0, max); }
function parseDraft(body: any, condominioId: string): RegulationDraftInput {
  const nombre = cleanText(body?.nombre, 180);
  if (nombre.length < 5) throw new Error('El nombre del Reglamento debe tener al menos 5 caracteres.');
  if (!Array.isArray(body?.articulos) || body.articulos.length < 1 || body.articulos.length > 50) throw new Error('Agrega entre 1 y 50 artículos.');
  const seen = new Set<string>();
  const articulos = body.articulos.map((item: any, index: number) => {
    const codigo = cleanText(item?.codigo, 30);
    const titulo = cleanText(item?.titulo, 180);
    if (!codigo || !titulo) throw new Error(`Completa el número y título del artículo ${index + 1}.`);
    const key = codigo.toLocaleLowerCase('es-MX');
    if (seen.has(key)) throw new Error(`El artículo ${codigo} está repetido.`);
    seen.add(key);
    if (!Array.isArray(item?.clausulas) || item.clausulas.length < 1 || item.clausulas.length > 30) throw new Error(`El artículo ${codigo} debe tener entre 1 y 30 cláusulas.`);
    const clausulas = item.clausulas.map((clause: any, clauseIndex: number) => {
      const texto = cleanText(clause?.texto, 8000);
      if (!texto) throw new Error(`La cláusula ${clauseIndex + 1} del artículo ${codigo} está vacía.`);
      return { codigo: cleanText(clause?.codigo, 30) || null, texto, orden: clauseIndex + 1 };
    });
    return { codigo, titulo, orden: index + 1, clausulas };
  });
  const documentoKey = cleanText(body?.documento_key, 1000) || null;
  if (documentoKey && !isFileKeyOwnedByCondominium(documentoKey, condominioId)) throw new Error('El documento no pertenece a este condominio.');
  return { nombre, documento_key: documentoKey, documento_nombre: cleanText(body?.documento_nombre, 255) || null, articulos };
}

function statusForError(error: any) {
  if (error?.code === '23505') return 409;
  return error?.statusCode || 400;
}
function routeId(req: AuthRequest) { return String(req.params.id || ''); }

export async function listRegulationsHandler(req: AuthRequest, res: Response) {
  try { return res.json(await listRegulations(req.user!.condominio_id)); }
  catch { return res.status(500).json({ error: 'No fue posible consultar los reglamentos.' }); }
}
export async function getEditableRegulationHandler(req: AuthRequest, res: Response) {
  try { return res.json(await getEditableRegulation(req.user!.condominio_id)); }
  catch { return res.status(500).json({ error: 'No fue posible consultar el Reglamento.' }); }
}
export async function getRegulationHandler(req: AuthRequest, res: Response) {
  try { const value=await getRegulation(routeId(req),req.user!.condominio_id); return value?res.json(value):res.status(404).json({error:'Reglamento no encontrado.'}); }
  catch { return res.status(500).json({ error: 'No fue posible consultar el Reglamento.' }); }
}
export async function createRegulationHandler(req: AuthRequest, res: Response) {
  try { return res.status(201).json(await createRegulationDraft(req.user!.condominio_id,req.user!.admin_id,parseDraft(req.body,req.user!.condominio_id))); }
  catch(error:any){return res.status(statusForError(error)).json({error:error?.code==='23505'?'Ya existe un borrador. Edítalo o elimínalo antes de crear otro.':error.message});}
}
export async function updateRegulationHandler(req: AuthRequest, res: Response) {
  try { const value=await updateRegulationDraft(routeId(req),req.user!.condominio_id,parseDraft(req.body,req.user!.condominio_id)); return value?res.json(value):res.status(409).json({error:'Sólo se puede modificar un borrador.'}); }
  catch(error:any){return res.status(statusForError(error)).json({error:error.message});}
}
export async function duplicateRegulationHandler(req: AuthRequest, res: Response) {
  try { const value=await duplicateCurrentRegulation(req.user!.condominio_id,req.user!.admin_id); return value?res.status(201).json(value):res.status(404).json({error:'No existe un Reglamento vigente para duplicar.'}); }
  catch(error:any){return res.status(statusForError(error)).json({error:error?.code==='23505'?'Ya existe un borrador pendiente.':error.message});}
}
export async function publishRegulationHandler(req: AuthRequest, res: Response) {
  try { const value=await publishRegulation(routeId(req),req.user!.condominio_id,req.user!.admin_id); return value?res.json(value):res.status(409).json({error:'El Reglamento no existe o ya fue publicado.'}); }
  catch(error:any){return res.status(500).json({error:error.message||'No fue posible publicar el Reglamento.'});}
}
export async function deleteRegulationHandler(req: AuthRequest, res: Response) {
  try { const value=await deleteRegulationDraft(routeId(req),req.user!.condominio_id); return value?res.status(204).send():res.status(409).json({error:'Sólo se puede eliminar un borrador.'}); }
  catch{return res.status(500).json({error:'No fue posible eliminar el borrador.'});}
}
export async function extractRegulationHandler(req: AuthRequest, res: Response) {
  try {
    if(!req.file)return res.status(400).json({error:'Selecciona una fotografía o PDF.'});
    const extracted=await extractRegulationFromFile(req.file,req.user!.condominio_id);
    if(!extracted.articulos.length)return res.status(422).json({error:'No se detectaron artículos legibles.'});
    const stored=await storeFile(req.file.buffer,req.user!.condominio_id,'reglamentos',req.file.originalname,true);
    await createFileRecord({condominioId:req.user!.condominio_id,key:stored.key,originalName:req.file.originalname,mime:stored.mime,size:req.file.size,category:'reglamentos',storage:stored.storage,uploadedBy:req.user!.admin_id});
    return res.json({...extracted,documento_key:stored.key,documento_nombre:req.file.originalname});
  } catch(error:any){return res.status(statusForError(error)).json({error:error.message||'No fue posible procesar el documento.'});}
}
