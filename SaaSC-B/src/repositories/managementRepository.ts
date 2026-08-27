import { pool } from '../db/index.js';
const EXPORT_QUERIES:Record<string,string>={
  residentes:`SELECT d.numero_depto departamento,u.nombre,u.telefono_whatsapp,u.rol,u.activo,u.acceso_porton FROM usuarios u JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id WHERE d.condominio_id=$1 ORDER BY d.numero_depto`,
  pagos:`SELECT d.numero_depto departamento,p.monto,p.estatus,p.creado_en FROM pagos p JOIN departamentos d ON d.id=p.depto_id WHERE d.condominio_id=$1 ORDER BY p.creado_en DESC`,
  multas:`SELECT d.numero_depto departamento,m.articulo_reglamento,m.motivo,m.monto,m.estatus,m.creado_en FROM multas m JOIN departamentos d ON d.id=m.depto_id WHERE d.condominio_id=$1 ORDER BY m.creado_en DESC`,
  visitas:`SELECT d.numero_depto departamento,v.nombre_visitante,v.placas_auto,v.cajon_asignado,v.estatus,v.fecha_entrada,v.fecha_salida FROM visitas v JOIN departamentos d ON d.id=v.depto_id WHERE d.condominio_id=$1 ORDER BY v.fecha_entrada DESC`,
  auditoria:`SELECT administrador_email,rol,accion,modulo,recurso,datos,ip,creado_en FROM auditoria WHERE condominio_id=$1 ORDER BY creado_en DESC`,
};
export const MANAGEMENT_EXPORTS=Object.freeze(Object.keys(EXPORT_QUERIES));
export async function listAudit(condominioId:string,limit:number){return(await pool.query(`SELECT * FROM auditoria WHERE condominio_id=$1 ORDER BY creado_en DESC LIMIT $2`,[condominioId,limit])).rows;}
export async function createExpense(input:{condominioId:string;categoria:string;concepto:string;monto:number;fecha?:string|null;comprobanteUrl?:string|null}){return(await pool.query(`INSERT INTO gastos(condominio_id,categoria,concepto,monto,fecha,comprobante_url) VALUES($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6) RETURNING *`,[input.condominioId,input.categoria,input.concepto,input.monto,input.fecha||null,input.comprobanteUrl||null])).rows[0];}
export async function listExpenses(condominioId:string){return(await pool.query(`SELECT * FROM gastos WHERE condominio_id=$1 ORDER BY fecha DESC`,[condominioId])).rows;}
export async function scopedDepartmentExists(id:string,condominioId:string){return Boolean((await pool.query(`SELECT 1 FROM departamentos WHERE id=$1 AND condominio_id=$2`,[id,condominioId])).rows[0]);}
export async function exportManagementModule(moduleName:string,condominioId:string){const query=EXPORT_QUERIES[moduleName];if(!query)return null;return pool.query(query,[condominioId]);}
export async function listBackups(condominioId:string){return(await pool.query(`SELECT * FROM respaldos WHERE condominio_id=$1 ORDER BY creado_en DESC LIMIT 30`,[condominioId])).rows;}
