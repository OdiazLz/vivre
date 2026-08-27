import { pool } from '../db/index.js';

export async function getCondominio(id: string) {
  const query = `SELECT * FROM condominios WHERE id=$1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export interface CondominioPaymentConfig {
  banco: string | null; titular_cuenta: string | null; numero_cuenta: string | null;
  clabe: string | null; numero_tarjeta: string | null; instrucciones_pago: string | null;
  notificar_presidente_comprobante: boolean; telefono_presidente_notificaciones: string | null;
}

export async function updateCondominio(id: string, nombre: string, monto_cuota: number, dia_corte: number, payment: CondominioPaymentConfig) {
  const query = `
    UPDATE condominios
    SET nombre=$1,monto_cuota=$2,dia_corte=$3,banco=$5,titular_cuenta=$6,numero_cuenta=$7,clabe=$8,numero_tarjeta=$9,instrucciones_pago=$10,
        notificar_presidente_comprobante=$11,telefono_presidente_notificaciones=$12
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [nombre, monto_cuota, dia_corte, id, payment.banco, payment.titular_cuenta, payment.numero_cuenta, payment.clabe, payment.numero_tarjeta, payment.instrucciones_pago, payment.notificar_presidente_comprobante, payment.telefono_presidente_notificaciones]);
  return result.rows[0];
}

export async function getPaymentProofNotificationTarget(condominioId: string) {
  const result = await pool.query(`
    SELECT telefono_presidente_notificaciones
    FROM condominios
    WHERE id=$1 AND estatus='ACTIVO' AND notificar_presidente_comprobante=true
      AND telefono_presidente_notificaciones IS NOT NULL
  `, [condominioId]);
  return result.rows[0]?.telefono_presidente_notificaciones as string | undefined;
}

export async function createCondominio(nombre: string, monto_cuota: number, dia_corte: number) {
  const query = `
    INSERT INTO condominios (nombre, monto_cuota, dia_corte)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [nombre, monto_cuota, dia_corte]);
  return result.rows[0];
}
