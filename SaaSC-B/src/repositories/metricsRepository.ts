import { pool } from '../db/index.js';

export async function getConfiguracion(condominioId: string) {
  const query = `SELECT monto_cuota FROM condominios WHERE id=$1;`;
  const result = await pool.query(query, [condominioId]);
  return result.rows[0];
}

export async function getTotalResidentes(condominioId: string) {
  const query = `SELECT COUNT(*) as total FROM departamentos WHERE condominio_id=$1;`;
  const result = await pool.query(query, [condominioId]);
  return parseInt(result.rows[0].total);
}

export async function getResidentesPagadosMes(condominioId: string) {
  const query = `
    SELECT COUNT(DISTINCT d.id) as total
    FROM departamentos d
    JOIN pagos p ON d.id = p.depto_id
    WHERE p.estatus = 'APROBADO'
    AND DATE_TRUNC('month', p.creado_en) = DATE_TRUNC('month', CURRENT_DATE)
    AND d.condominio_id=$1;
  `;
  const result = await pool.query(query, [condominioId]);
  return parseInt(result.rows[0].total);
}

export async function getTotalRecaudadoMes(condominioId: string) {
  const query = `
    SELECT COALESCE(SUM(p.monto), 0) as total
    FROM pagos p JOIN departamentos d ON d.id=p.depto_id
    WHERE p.estatus = 'APROBADO'
    AND DATE_TRUNC('month', p.creado_en) = DATE_TRUNC('month', CURRENT_DATE)
    AND d.condominio_id=$1;
  `;
  const result = await pool.query(query, [condominioId]);
  return parseFloat(result.rows[0].total);
}

export async function getRecaudacionMensual(condominioId: string) {
  const config = await getConfiguracion(condominioId);
  const montoCuota = config?.monto_cuota || 0;
  
  const totalResidentes = await getTotalResidentes(condominioId);
  const metaMes = totalResidentes * montoCuota;
  
  const totalRecaudado = await getTotalRecaudadoMes(condominioId);
  const porcentaje = metaMes > 0 ? Math.round((totalRecaudado / metaMes) * 100) : 0;
  const residentesPagados = await getResidentesPagadosMes(condominioId);

  return {
    totalRecaudado,
    metaMes,
    porcentaje,
    residentesPagados,
    totalResidentes
  };
}
