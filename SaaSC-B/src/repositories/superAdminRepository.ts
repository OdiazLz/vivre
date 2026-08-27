import { pool } from '../db/index.js';

export interface NewLicensedCondominium { nombre:string; montoCuota:number; diaCorte:number; presidenteNombre:string; presidenteEmail:string; presidentePasswordHash:string }
export async function createLicensedCondominium(input:NewLicensedCondominium){
  const client=await pool.connect();
  try{await client.query('BEGIN');
    if((await client.query(`SELECT 1 FROM condominios WHERE LOWER(nombre)=LOWER($1)`,[input.nombre])).rows[0]){const error=new Error('Ya existe una privada con ese nombre.');(error as any).statusCode=409;throw error;}
    if((await client.query(`SELECT 1 FROM administradores WHERE LOWER(email)=LOWER($1)`,[input.presidenteEmail])).rows[0]){const error=new Error('El correo del Presidente ya está registrado.');(error as any).statusCode=409;throw error;}
    const condominium=await client.query(`INSERT INTO condominios(nombre,monto_cuota,dia_corte,estatus) VALUES($1,$2,$3,'ACTIVO') RETURNING id,nombre,monto_cuota,dia_corte,estatus,creado_en`,[input.nombre,input.montoCuota,input.diaCorte]);
    const account=await client.query(`INSERT INTO administradores(condominio_id,nombre,email,password_hash,rol,activo) VALUES($1,$2,$3,$4,'PRESIDENTE',true) RETURNING id,nombre,email,rol,activo,creado_en`,[condominium.rows[0].id,input.presidenteNombre,input.presidenteEmail,input.presidentePasswordHash]);
    await client.query('COMMIT');return{condominio:condominium.rows[0],presidente:account.rows[0]};
  }catch(error){await client.query('ROLLBACK').catch(()=>undefined);throw error;}finally{client.release();}
}
export async function condominiumExists(id:string){return Boolean((await pool.query('SELECT 1 FROM condominios WHERE id=$1',[id])).rows[0]);}
export async function listCondominiumAdministrativeAccounts(id:string){return(await pool.query(`SELECT id,nombre,email,rol,activo,ultimo_acceso,creado_en FROM administradores WHERE condominio_id=$1 ORDER BY (rol='ADMINISTRADOR') DESC,nombre`,[id])).rows;}
