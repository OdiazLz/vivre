import { pool } from "../db/index.js";
import { getFileAccessUrl } from "../services/storageService.js";

export async function createIncidencia(deptoId: string, usuarioId: string, descripcion: string, fotoUrl: string | undefined, condominioId: string): Promise<any> {
    const query = `
      INSERT INTO incidencias (depto_id, usuario_id, descripcion, foto_url)
      SELECT $1, $2, $3, $4 FROM departamentos d JOIN depto_usuarios du ON du.depto_id=d.id
      WHERE d.id=$1 AND du.usuario_id=$2 AND d.condominio_id=$5
      RETURNING *;
    `;
    const result = await pool.query(query, [deptoId, usuarioId, descripcion, fotoUrl || null, condominioId]);
    return result.rows[0];
  }

export async function getAllIncidencias(condominioId: string): Promise<any[]> {
    const query = `
        SELECT 
            i.id,
            i.descripcion,
            i.foto_url,
            i.creado_en,
            d.numero_depto,
            u.nombre AS usuario_nombre,
            u.telefono_whatsapp,
            i.estatus
        FROM incidencias i
        JOIN departamentos d ON i.depto_id = d.id
        JOIN usuarios u ON i.usuario_id = u.id
        WHERE d.condominio_id=$1
    `;
    const result = await pool.query(query, [condominioId]);
    return Promise.all(result.rows.map(async row => ({
      ...row,
      foto_url: await getFileAccessUrl(row.foto_url)
    })));
}

export async function updateEstatus(id: string, estatus: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO', condominioId: string): Promise<any> {
    const updateQuery = `
        UPDATE incidencias
        SET estatus = $1
        WHERE id=$2 AND EXISTS (SELECT 1 FROM departamentos d WHERE d.id=incidencias.depto_id AND d.condominio_id=$3)
        RETURNING *;
    `;
    const updateResult = await pool.query(updateQuery, [estatus, id, condominioId]);
    
    if (!updateResult.rows[0]) {
        return null;
    }

    const selectQuery = `
        SELECT 
            i.id,
            i.descripcion,
            i.foto_url,
            i.creado_en,
            i.estatus,
            d.numero_depto,
            u.nombre AS usuario_nombre,
            u.telefono_whatsapp
        FROM incidencias i
        JOIN departamentos d ON i.depto_id = d.id
        JOIN usuarios u ON i.usuario_id = u.id
        WHERE i.id = $1;
    `;
    const selectResult = await pool.query(selectQuery, [id]);
    const row = selectResult.rows[0];
    return row ? { ...row, foto_url: await getFileAccessUrl(row.foto_url) } : null;
}

export async function deleteIncidencia(id: string, condominioId: string) {
  const query = `DELETE FROM incidencias i WHERE i.id=$1 AND EXISTS (SELECT 1 FROM departamentos d WHERE d.id=i.depto_id AND d.condominio_id=$2) RETURNING i.*;`;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}
