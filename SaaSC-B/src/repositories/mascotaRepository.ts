import { pool } from '../db/index.js';
import { getFileAccessUrl } from '../services/storageService.js';

export async function getAllMascotas(condominioId: string) {
  const query = `
    SELECT 
      m.id,
      m.nombre,
      m.especie_raza,
      m.tiene_placa,
      m.foto_url,
      m.usuario_id,
      m.depto_id,
      u.nombre as usuario_nombre,
      d.numero_depto
    FROM mascotas m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    JOIN departamentos d ON m.depto_id = d.id
    WHERE d.condominio_id=$1
    ORDER BY m.nombre ASC;
  `;
  const result = await pool.query(query, [condominioId]);
  return Promise.all(result.rows.map(async (row) => ({ ...row, foto_url: await getFileAccessUrl(row.foto_url) })));
}

export async function getMascotasByUsuario(usuarioId: string) {
  const query = `
    SELECT m.*, d.numero_depto
    FROM mascotas m
    JOIN departamentos d ON m.depto_id = d.id
    WHERE m.usuario_id = $1 ORDER BY m.nombre ASC;
  `;
  const result = await pool.query(query, [usuarioId]);
  return result.rows;
}

export async function createMascota(nombre: string, especie_raza: string, tiene_placa: boolean, depto_id: string, usuario_id: string, foto_url: string | undefined, condominioId: string) {
  const query = `
    INSERT INTO mascotas (nombre, especie_raza, tiene_placa, depto_id, usuario_id, foto_url)
    SELECT $1,$2,$3,d.id,u.id,$6 FROM departamentos d JOIN depto_usuarios du ON du.depto_id=d.id JOIN usuarios u ON u.id=du.usuario_id
    WHERE d.id=$4 AND u.id=$5 AND d.condominio_id=$7
    RETURNING *;
  `;
  const params = [nombre, especie_raza, tiene_placa, depto_id, usuario_id, foto_url || null, condominioId];
  const result = await pool.query(query, params);
  return result.rows[0];
}

export async function deleteMascota(id: string, condominioId: string) {
  const query = `DELETE FROM mascotas WHERE id = $1 AND depto_id IN(SELECT id FROM departamentos WHERE condominio_id=$2) RETURNING *;`;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}
