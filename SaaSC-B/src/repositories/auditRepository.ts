import { pool } from '../db/index.js';
export interface AuditEntry { condominioId:string|null; administradorId:string;email:string;rol:string;accion:string;modulo:string;recurso:string;datos:unknown;ip:string|undefined }
export async function createAuditEntry(entry:AuditEntry){await pool.query(`INSERT INTO auditoria(condominio_id,administrador_id,administrador_email,rol,accion,modulo,recurso,datos,ip) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[entry.condominioId,entry.administradorId,entry.email,entry.rol,entry.accion,entry.modulo,entry.recurso,JSON.stringify(entry.datos),entry.ip]);}
