import { randomBytes } from 'node:crypto';
import { pool } from '../db/index.js';

export async function createInvitationCode(condominioId: string, adminId: string, description?: string, days = 30, maxUses = 100) {
  const condominium = await pool.query('SELECT nombre FROM condominios WHERE id=$1', [condominioId]);
  if (!condominium.rows[0]) throw new Error('Condominio no encontrado.');
  const prefix = String(condominium.rows[0].nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase() || 'CONDO';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const result = await pool.query(`
      INSERT INTO codigos_invitacion(condominio_id,codigo,descripcion,expira_en,max_usos,creado_por)
      VALUES($1,$2,$3,NOW()+($4::text || ' days')::interval,$5,$6)
      ON CONFLICT(codigo) DO NOTHING RETURNING *
    `, [condominioId, code, description || 'Registro de residentes', days, maxUses, adminId]);
    if (result.rows[0]) return { ...result.rows[0], condominio_nombre: condominium.rows[0].nombre };
  }
  throw new Error('No se pudo generar un código único.');
}

export async function listInvitationCodes(condominioId: string) {
  const result = await pool.query(`SELECT *, (activo AND expira_en>NOW() AND usos<max_usos) vigente FROM codigos_invitacion WHERE condominio_id=$1 ORDER BY creado_en DESC`, [condominioId]);
  return result.rows;
}

export async function deactivateInvitationCode(id: string, condominioId: string) {
  const result = await pool.query(`UPDATE codigos_invitacion SET activo=false WHERE id=$1 AND condominio_id=$2 RETURNING *`, [id, condominioId]);
  return result.rows[0] || null;
}

export async function validateInvitationCode(code: string) {
  const result = await pool.query(`
    SELECT ci.*, c.nombre condominio_nombre, c.estatus condominio_estatus FROM codigos_invitacion ci
    JOIN condominios c ON c.id=ci.condominio_id
    WHERE UPPER(ci.codigo)=UPPER($1) AND ci.activo=true AND ci.expira_en>NOW() AND ci.usos<ci.max_usos
  `, [code]);
  return result.rows[0] || null;
}

export async function getWhatsAppSession(phone: string) {
  const result = await pool.query(`SELECT * FROM sesiones_whatsapp WHERE telefono_whatsapp=$1 AND expira_en>NOW()`, [phone]);
  return result.rows[0] || null;
}

export async function saveWhatsAppSession(phone: string, condominioId: string | null, state: string, data: Record<string, unknown> = {}, invitationId?: string) {
  const result = await pool.query(`
    INSERT INTO sesiones_whatsapp(telefono_whatsapp,condominio_id,codigo_invitacion_id,estado,datos,expira_en,actualizado_en)
    VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '30 days',NOW())
    ON CONFLICT(telefono_whatsapp) DO UPDATE SET condominio_id=EXCLUDED.condominio_id,
      codigo_invitacion_id=EXCLUDED.codigo_invitacion_id,estado=EXCLUDED.estado,datos=EXCLUDED.datos,
      expira_en=EXCLUDED.expira_en,actualizado_en=NOW()
    RETURNING *
  `, [phone, condominioId, invitationId || null, state, JSON.stringify(data)]);
  return result.rows[0];
}

export async function createRegistrationRequest(phone: string, department: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionResult = await client.query(`SELECT * FROM sesiones_whatsapp WHERE telefono_whatsapp=$1 AND estado='REGISTRO_DEPARTAMENTO' AND expira_en>NOW() FOR UPDATE`, [phone]);
    const session = sessionResult.rows[0];
    if (!session?.condominio_id || !session?.codigo_invitacion_id || !session.datos?.nombre) throw new Error('La sesión de registro expiró. Envía ALTA seguido de tu código.');
    const membership = await client.query(`SELECT 1 FROM usuarios u JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id WHERE u.telefono_whatsapp=$1 AND d.condominio_id=$2`, [phone, session.condominio_id]);
    if (membership.rows[0]) throw new Error('Tu número ya está registrado en esta privada. Escribe Menú para continuar.');
    const invitation = await client.query(`UPDATE codigos_invitacion SET usos=usos+1 WHERE id=$1 AND condominio_id=$2 AND activo=true AND expira_en>NOW() AND usos<max_usos RETURNING id`, [session.codigo_invitacion_id, session.condominio_id]);
    if (!invitation.rows[0]) throw new Error('El código de invitación expiró o alcanzó su límite de usos.');
    const duplicate = await client.query(`SELECT id FROM solicitudes_registro WHERE condominio_id=$1 AND telefono_whatsapp=$2 AND estatus='PENDIENTE'`, [session.condominio_id, phone]);
    if (duplicate.rows[0]) throw new Error('Ya tienes una solicitud pendiente para esta privada.');
    const request = await client.query(`
      INSERT INTO solicitudes_registro(condominio_id,codigo_invitacion_id,telefono_whatsapp,nombre,numero_depto)
      VALUES($1,$2,$3,$4,$5) RETURNING *
    `, [session.condominio_id, session.codigo_invitacion_id, phone, session.datos.nombre, department]);
    await client.query(`UPDATE sesiones_whatsapp SET estado='SOLICITUD_PENDIENTE',datos=$2,actualizado_en=NOW() WHERE telefono_whatsapp=$1`, [phone, JSON.stringify({ solicitud_id: request.rows[0].id })]);
    await client.query('COMMIT');
    return request.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function getPhoneMemberships(phone: string) {
  const result = await pool.query(`
    SELECT DISTINCT c.id condominio_id,c.nombre condominio_nombre FROM usuarios u
    JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id
    JOIN condominios c ON c.id=d.condominio_id WHERE u.telefono_whatsapp=$1 ORDER BY c.nombre
  `, [phone]);
  return result.rows;
}

export async function listRegistrationRequests(condominioId: string, status?: string) {
  const params: unknown[] = [condominioId];
  const filter = status ? 'AND sr.estatus=$2' : '';
  if (status) params.push(status);
  const result = await pool.query(`SELECT sr.*,c.nombre condominio_nombre FROM solicitudes_registro sr JOIN condominios c ON c.id=sr.condominio_id WHERE sr.condominio_id=$1 ${filter} ORDER BY sr.creado_en DESC`, params);
  return result.rows;
}

export async function approveRegistrationRequest(id: string, condominioId: string, adminId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(`SELECT * FROM solicitudes_registro WHERE id=$1 AND condominio_id=$2 AND estatus='PENDIENTE' FOR UPDATE`, [id, condominioId]);
    const request = requestResult.rows[0];
    if (!request) { await client.query('ROLLBACK'); return null; }
    let department = await client.query(`SELECT id,numero_depto FROM departamentos WHERE condominio_id=$1 AND LOWER(numero_depto)=LOWER($2) ORDER BY creado_en LIMIT 1`, [condominioId, request.numero_depto]);
    if (!department.rows[0]) department = await client.query(`INSERT INTO departamentos(condominio_id,numero_depto) VALUES($1,$2) RETURNING id,numero_depto`, [condominioId, request.numero_depto]);
    let user = await client.query(`SELECT id,nombre FROM usuarios WHERE telefono_whatsapp=$1`, [request.telefono_whatsapp]);
    if (!user.rows[0]) user = await client.query(`INSERT INTO usuarios(nombre,telefono_whatsapp,rol,activo) VALUES($1,$2,'RESIDENTE',true) RETURNING id,nombre`, [request.nombre, request.telefono_whatsapp]);
    await client.query(`INSERT INTO depto_usuarios(usuario_id,depto_id) SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM depto_usuarios WHERE usuario_id=$1 AND depto_id=$2)`, [user.rows[0].id, department.rows[0].id]);
    const approved = await client.query(`UPDATE solicitudes_registro SET estatus='APROBADA',usuario_id=$1,depto_id=$2,revisado_por=$3,revisado_en=NOW() WHERE id=$4 RETURNING *`, [user.rows[0].id, department.rows[0].id, adminId, id]);
    await client.query(`UPDATE sesiones_whatsapp SET condominio_id=$1,estado='ACTIVA',datos='{}',expira_en=NOW()+INTERVAL '30 days',actualizado_en=NOW() WHERE telefono_whatsapp=$2`, [condominioId, request.telefono_whatsapp]);
    await client.query('COMMIT');
    return { ...approved.rows[0], numero_depto: department.rows[0].numero_depto };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function rejectRegistrationRequest(id: string, condominioId: string, adminId: string, reason?: string) {
  const result = await pool.query(`UPDATE solicitudes_registro SET estatus='RECHAZADA',motivo_rechazo=$1,revisado_por=$2,revisado_en=NOW() WHERE id=$3 AND condominio_id=$4 AND estatus='PENDIENTE' RETURNING *`, [reason || null, adminId, id, condominioId]);
  if (result.rows[0]) await pool.query(`UPDATE sesiones_whatsapp SET estado='ACTIVA',datos='{}',actualizado_en=NOW() WHERE telefono_whatsapp=$1`, [result.rows[0].telefono_whatsapp]);
  return result.rows[0] || null;
}
