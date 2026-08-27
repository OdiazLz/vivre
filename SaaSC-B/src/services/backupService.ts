import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db/index.js';
import { config } from '../config/index.js';
import { storeBackupArtifact } from './storageService.js';

const execFileAsync = promisify(execFile);

async function persistBackup(localPath: string, condominioId?: string) {
  const file = await stat(localPath);
  const key = `respaldos/${condominioId || 'global'}/${path.basename(localPath)}`;
  const stored = await storeBackupArtifact(await readFile(localPath), key);
  if (stored.storage === 'S3') await unlink(localPath).catch(() => undefined);
  await pool.query(`INSERT INTO respaldos(condominio_id, archivo, estatus, tamano_bytes) VALUES($1,$2,'COMPLETADO',$3)`, [condominioId || null, stored.storage === 'S3' ? stored.key : localPath, file.size]);
  return { archivo: stored.storage === 'S3' ? stored.key : localPath, tamano_bytes: file.size, estatus: 'COMPLETADO', almacenamiento: stored.storage };
}

async function createTenantLogicalBackup(condominioId: string, directory: string, stamp: string) {
  const jsonPath = path.join(directory, `vivre-condominio-${stamp}.json`);
  const queries: Record<string, string> = {
    condominios: 'SELECT * FROM condominios WHERE id=$1',
    departamentos: 'SELECT * FROM departamentos WHERE condominio_id=$1',
    administradores: 'SELECT id,condominio_id,nombre,email,rol,activo,ultimo_acceso,creado_en FROM administradores WHERE condominio_id=$1',
    usuarios: 'SELECT DISTINCT u.* FROM usuarios u JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id WHERE d.condominio_id=$1',
    depto_usuarios: 'SELECT du.* FROM depto_usuarios du JOIN departamentos d ON d.id=du.depto_id WHERE d.condominio_id=$1',
    cargos: 'SELECT c.* FROM cargos c JOIN departamentos d ON d.id=c.depto_id WHERE d.condominio_id=$1',
    pagos: 'SELECT p.* FROM pagos p JOIN departamentos d ON d.id=p.depto_id WHERE d.condominio_id=$1',
    incidencias: 'SELECT i.* FROM incidencias i JOIN departamentos d ON d.id=i.depto_id WHERE d.condominio_id=$1',
    mascotas: 'SELECT m.* FROM mascotas m JOIN departamentos d ON d.id=m.depto_id WHERE d.condominio_id=$1',
    visitas: 'SELECT v.* FROM visitas v JOIN departamentos d ON d.id=v.depto_id WHERE d.condominio_id=$1',
    eventos: 'SELECT e.* FROM eventos e JOIN departamentos d ON d.id=e.depto_id WHERE d.condominio_id=$1',
    evento_cajones: 'SELECT ec.* FROM evento_cajones ec JOIN eventos e ON e.id=ec.evento_id JOIN departamentos d ON d.id=e.depto_id WHERE d.condominio_id=$1',
    multas: 'SELECT m.* FROM multas m JOIN departamentos d ON d.id=m.depto_id WHERE d.condominio_id=$1',
    cajones_estacionamiento: 'SELECT * FROM cajones_estacionamiento WHERE condominio_id=$1',
    reservas_cajones: 'SELECT r.* FROM reservas_cajones r JOIN cajones_estacionamiento c ON c.id=r.cajon_id WHERE c.condominio_id=$1',
    gastos: 'SELECT * FROM gastos WHERE condominio_id=$1',
    estados_financieros: 'SELECT * FROM estados_financieros WHERE condominio_id=$1',
    comunicados: 'SELECT * FROM comunicados WHERE condominio_id=$1',
    auditoria: 'SELECT * FROM auditoria WHERE condominio_id=$1',
    codigos_invitacion: 'SELECT * FROM codigos_invitacion WHERE condominio_id=$1',
    solicitudes_registro: 'SELECT * FROM solicitudes_registro WHERE condominio_id=$1',
    archivos: 'SELECT * FROM archivos WHERE condominio_id=$1',
    asambleas: 'SELECT * FROM asambleas WHERE condominio_id=$1',
    preguntas_asamblea: 'SELECT p.* FROM preguntas_asamblea p JOIN asambleas a ON a.id=p.asamblea_id WHERE a.condominio_id=$1',
    opciones_votacion: 'SELECT o.* FROM opciones_votacion o JOIN preguntas_asamblea p ON p.id=o.pregunta_id JOIN asambleas a ON a.id=p.asamblea_id WHERE a.condominio_id=$1',
    votos_asamblea: 'SELECT v.* FROM votos_asamblea v JOIN preguntas_asamblea p ON p.id=v.pregunta_id JOIN asambleas a ON a.id=p.asamblea_id WHERE a.condominio_id=$1',
  };
  const data: Record<string, unknown[]> = {};
  for (const [table, sql] of Object.entries(queries)) data[table] = (await pool.query(sql, [condominioId])).rows;
  await writeFile(jsonPath, JSON.stringify({ version: 2, tipo: 'RESPALDO_CONDOMINIO', condominio_id: condominioId, generado_en: new Date().toISOString(), tablas: data }, null, 2), 'utf8');
  return { ...(await persistBackup(jsonPath, condominioId)), formato: 'JSON_LOGICO_AISLADO' };
}

export async function createDatabaseBackup(condominioId?: string) {
  const directory = path.resolve('backups');
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(directory, `vivre-${stamp}.backup`);
  if (condominioId) return createTenantLogicalBackup(condominioId, directory, stamp);
  try {
    if (!config.database.url) throw new Error('DATABASE_URL no está configurada');
    await execFileAsync('pg_dump', ['--dbname', config.database.url, '--format=custom', '--file', filePath]);
    return await persistBackup(filePath, condominioId);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      const jsonPath = filePath.replace(/\.backup$/, '.json');
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
      const data: Record<string, unknown[]> = {};
      for (const { table_name } of tables.rows) {
        const safeName = String(table_name).replace(/"/g, '""');
        const rows = await pool.query(`SELECT * FROM "${safeName}"`);
        data[table_name] = rows.rows;
      }
      await writeFile(jsonPath, JSON.stringify({ version: 1, generado_en: new Date().toISOString(), tablas: data }, null, 2), 'utf8');
      return { ...(await persistBackup(jsonPath, condominioId)), formato: 'JSON_LOGICO' };
    }
    await pool.query(`INSERT INTO respaldos(condominio_id, archivo, estatus, error) VALUES($1,$2,'ERROR',$3)`, [condominioId || null, filePath, error.message]);
    throw error;
  }
}
