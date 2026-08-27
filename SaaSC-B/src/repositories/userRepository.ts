import { pool } from '../db/index.js';
import type { Usuario } from '../types/user.js';

export async function getUserByPhone(phone: string): Promise<Usuario | null> {
    const query = `
        SELECT u.id, u.nombre, u.telefono_whatsapp, d.id as depto_id, d.numero_depto, d.condominio_id
        FROM usuarios u
        JOIN depto_usuarios du ON u.id = du.usuario_id
        JOIN departamentos d ON du.depto_id = d.id
        WHERE u.telefono_whatsapp = $1
        ORDER BY (d.condominio_id = (SELECT condominio_id FROM sesiones_whatsapp WHERE telefono_whatsapp=$1 AND expira_en>NOW())) DESC,
          d.creado_en ASC
        LIMIT 1
    `;
    const result = await pool.query(query, [phone]);
    return result.rows[0] || null;
}

export async function getAllActiveUsers(condominioId?: string) {
    const query = `
    SELECT u.id, u.nombre, u.telefono_whatsapp, d.id as depto_id, d.numero_depto, d.condominio_id
    FROM usuarios u
    JOIN depto_usuarios du ON u.id = du.usuario_id
    JOIN departamentos d ON du.depto_id = d.id
    WHERE u.activo = true AND ($1::uuid IS NULL OR d.condominio_id = $1)
    `;
    const result = await pool.query(query, [condominioId || null]);
    return result.rows;
}

export async function getAllUsers(condominioId: string) {
  const query = `
    SELECT 
      u.id,
      u.nombre,
      u.telefono_whatsapp,
      u.rol,
      u.creado_en,
      u.acceso_porton,
      u.activo,
      d.id AS depto_id,
      d.numero_depto
    FROM usuarios u
    JOIN depto_usuarios du ON u.id = du.usuario_id
    JOIN departamentos d ON du.depto_id = d.id
    WHERE d.condominio_id = $1
    ORDER BY d.numero_depto ASC;
  `;
  const result = await pool.query(query, [condominioId]);
  return result.rows;
}

export async function getAllDepartamentos(condominioId: string) {
  const result = await pool.query(`
    SELECT id, numero_depto, condominio_id
    FROM departamentos
    WHERE condominio_id = $1
    ORDER BY numero_depto ASC;
  `, [condominioId]);
  return result.rows;
}

export async function getPrimaryUserByDepto(deptoId: string) {
  const result = await pool.query(`
    SELECT u.nombre, u.telefono_whatsapp, d.numero_depto
    FROM depto_usuarios du
    JOIN usuarios u ON u.id = du.usuario_id
    JOIN departamentos d ON d.id = du.depto_id
    WHERE du.depto_id = $1
    ORDER BY u.creado_en ASC
    LIMIT 1;
  `, [deptoId]);
  return result.rows[0] || null;
}

export async function createUser(
  nombre: string,
  telefono_whatsapp: string,
  deptoId: string | undefined,
  numeroDepto: string,
  condominioId: string,
  rol?: string,
  activo = true
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let deptoResult = deptoId
      ? await client.query('SELECT id, numero_depto FROM departamentos WHERE id = $1 AND condominio_id = $2', [deptoId, condominioId])
      : await client.query('SELECT id, numero_depto FROM departamentos WHERE condominio_id = $1 AND LOWER(numero_depto) = LOWER($2)', [condominioId, numeroDepto]);

    if (!deptoResult.rows[0]) {
      deptoResult = await client.query(`
        INSERT INTO departamentos (condominio_id, numero_depto)
        VALUES ($1, $2)
        RETURNING id, numero_depto;
      `, [condominioId, numeroDepto]);
    }
    const depto_id = deptoResult.rows[0].id;

    const userResult = await client.query(`
      INSERT INTO usuarios (nombre, telefono_whatsapp, rol, activo)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [nombre, telefono_whatsapp, rol || 'RESIDENTE', activo]);
    const usuario = userResult.rows[0];
    await client.query('INSERT INTO depto_usuarios (usuario_id, depto_id) VALUES ($1, $2)', [usuario.id, depto_id]);
    await client.query('COMMIT');
    return { ...usuario, depto_id, numero_depto: deptoResult.rows[0].numero_depto };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(
  id: string,
  nombre: string,
  telefono_whatsapp: string,
  deptoId: string | undefined,
  numeroDepto: string,
  condominioId: string,
  rol?: string,
  activo = true
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ownedUser = await client.query(`SELECT 1 FROM depto_usuarios du JOIN departamentos d ON d.id=du.depto_id WHERE du.usuario_id=$1 AND d.condominio_id=$2 FOR UPDATE`, [id, condominioId]);
    if (!ownedUser.rows[0]) { await client.query('ROLLBACK'); return null; }
    let deptoResult = deptoId
      ? await client.query('SELECT id, numero_depto FROM departamentos WHERE id = $1 AND condominio_id = $2', [deptoId, condominioId])
      : await client.query('SELECT id, numero_depto FROM departamentos WHERE condominio_id = $1 AND LOWER(numero_depto) = LOWER($2)', [condominioId, numeroDepto]);
    if (!deptoResult.rows[0]) {
      deptoResult = await client.query(`
      INSERT INTO departamentos (condominio_id, numero_depto)
      VALUES ($1, $2)
      RETURNING id, numero_depto;
    `, [condominioId, numeroDepto]);
    }
    const depto_id = deptoResult.rows[0].id;
    await client.query('UPDATE depto_usuarios SET depto_id = $1 WHERE usuario_id = $2', [depto_id, id]);
    const result = await client.query(`UPDATE usuarios SET nombre=$1,telefono_whatsapp=$2,rol=$3,activo=$4 WHERE id=$5 RETURNING *`, [nombre, telefono_whatsapp, rol || 'RESIDENTE', activo, id]);
    await client.query('COMMIT');
    return result.rows[0] ? { ...result.rows[0], depto_id, numero_depto: deptoResult.rows[0].numero_depto } : null;
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); }
}

export async function deleteUser(id: string, condominioId: string) {
  const query = `DELETE FROM usuarios u WHERE u.id=$1 AND EXISTS (SELECT 1 FROM depto_usuarios du JOIN departamentos d ON d.id=du.depto_id WHERE du.usuario_id=u.id AND d.condominio_id=$2) RETURNING u.*;`;
  const result = await pool.query(query, [id, condominioId]);
  return result.rows[0];
}

export async function updateAccesoPorton(id: string, acceso_porton: boolean, condominioId: string) {
  const query = `
    UPDATE usuarios
    SET acceso_porton = $1
    WHERE id = $2 AND EXISTS (SELECT 1 FROM depto_usuarios du JOIN departamentos d ON d.id=du.depto_id WHERE du.usuario_id=usuarios.id AND d.condominio_id=$3)
    RETURNING *;
  `;
  const result = await pool.query(query, [acceso_porton, id, condominioId]);
  return result.rows[0];
}

export interface BulkResidentInput {
  fila: number;
  nombre: string;
  numero_depto: string;
  telefono_whatsapp: string;
}

export async function importUsersBulk(condominioId: string, residents: BulkResidentInput[]) {
  const client = await pool.connect();
  const created: Array<BulkResidentInput & { id: string; depto_id: string }> = [];
  const skipped: Array<BulkResidentInput & { motivo: string }> = [];
  try {
    await client.query('BEGIN');
    const phones = residents.map((item) => item.telefono_whatsapp);
    const existingResult = await client.query('SELECT telefono_whatsapp FROM usuarios WHERE telefono_whatsapp = ANY($1::varchar[])', [phones]);
    const existingPhones = new Set(existingResult.rows.map((row) => row.telefono_whatsapp));
    const departments = new Map<string, string>();

    for (const resident of residents) {
      if (existingPhones.has(resident.telefono_whatsapp)) {
        skipped.push({ ...resident, motivo: 'El teléfono ya está registrado.' });
        continue;
      }

      const departmentKey = resident.numero_depto.trim().toLowerCase();
      let departmentId = departments.get(departmentKey);
      if (!departmentId) {
        let departmentResult = await client.query(`SELECT id FROM departamentos WHERE condominio_id=$1 AND LOWER(numero_depto)=LOWER($2) ORDER BY creado_en LIMIT 1`, [condominioId, resident.numero_depto]);
        if (!departmentResult.rows[0]) {
          departmentResult = await client.query(`INSERT INTO departamentos(condominio_id,numero_depto) VALUES($1,$2) RETURNING id`, [condominioId, resident.numero_depto]);
        }
        departmentId = departmentResult.rows[0].id;
        departments.set(departmentKey, departmentId!);
      }

      const userResult = await client.query(`
        INSERT INTO usuarios(nombre,telefono_whatsapp,rol,activo)
        VALUES($1,$2,'RESIDENTE',true)
        ON CONFLICT (telefono_whatsapp) DO NOTHING RETURNING id
      `, [resident.nombre, resident.telefono_whatsapp]);
      if (!userResult.rows[0]) {
        skipped.push({ ...resident, motivo: 'El teléfono fue registrado simultáneamente por otro usuario.' });
        continue;
      }
      await client.query('INSERT INTO depto_usuarios(usuario_id,depto_id) VALUES($1,$2)', [userResult.rows[0].id, departmentId]);
      created.push({ ...resident, id: userResult.rows[0].id, depto_id: departmentId! });
      existingPhones.add(resident.telefono_whatsapp);
    }
    await client.query('COMMIT');
    return { created, skipped };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
