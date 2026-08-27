import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { getAllMascotas, createMascota, deleteMascota } from '../repositories/mascotaRepository.js';
import { deleteStoredFile, isFileKeyOwnedByCondominium } from '../services/storageService.js';

export async function getMascotasHandler(req: AuthRequest, res: Response) {
  try {
    const mascotas = await getAllMascotas(req.user!.condominio_id);
    return res.status(200).json(mascotas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createMascotaHandler(req: AuthRequest, res: Response) {
  try {
    const { nombre, especie_raza, tiene_placa, depto_id, usuario_id, foto_url } = req.body;

    if (!nombre || !especie_raza || !depto_id || !usuario_id) {
      return res.status(400).json({ error: 'Nombre, especie_raza, depto_id y usuario_id son obligatorios.' });
    }

    if (foto_url && !isFileKeyOwnedByCondominium(foto_url, req.user!.condominio_id)) return res.status(400).json({ error: 'La imagen no pertenece a este condominio.' });
    const nuevaMascota = await createMascota(nombre.trim(), especie_raza.trim(), tiene_placa !== false, depto_id, usuario_id, foto_url || undefined, req.user!.condominio_id);
    if (!nuevaMascota) return res.status(404).json({ error: 'Residente o departamento no encontrado en este condominio.' });
    return res.status(201).json(nuevaMascota);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteMascotaHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await deleteMascota(id as string, req.user!.condominio_id);

    if (!deleted) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    void deleteStoredFile(deleted.foto_url).catch(() => undefined);
    return res.status(200).json({ message: 'Mascota eliminada correctamente.', mascota: deleted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
