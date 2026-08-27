import { pool } from '../db/index.js';
import type { RegulationArticle } from '../types/domain.js';
export async function listRegulationArticles(condominioId:string):Promise<RegulationArticle[]>{
  const result=await pool.query<RegulationArticle>(`SELECT DISTINCT ON (codigo) id,codigo,nombre,etiqueta,descripcion,orden FROM catalogo_articulos_reglamento WHERE activo=true AND (condominio_id=$1 OR condominio_id IS NULL) ORDER BY codigo,(condominio_id=$1) DESC,orden`,[condominioId]);
  return result.rows.sort((a,b)=>Number(a.orden)-Number(b.orden));
}
export async function isValidRegulationArticle(condominioId:string,label:string){
  const result=await pool.query(`SELECT 1 FROM catalogo_articulos_reglamento WHERE activo=true AND etiqueta=$2 AND (condominio_id=$1 OR condominio_id IS NULL) LIMIT 1`,[condominioId,label]);
  return Boolean(result.rows[0]);
}
