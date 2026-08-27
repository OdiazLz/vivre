import { pool } from "../db/index.js";
import type { CreatePaymentDTO, IPago, UpdatePaymentStatusDTO } from "../types/payment.js";
import { getFileAccessUrl } from '../services/storageService.js';

export async function createPaymentRecord(paymentData: CreatePaymentDTO): Promise<IPago>{
    const query = `
        INSERT INTO pagos (depto_id, comprobante_url, monto, cargo_id, estatus)
        VALUES ($1, $2, $3, $4, 'PENDIENTE_REVISION')
        RETURNING *;
    `;
    const values = [
        paymentData.depto_id,
        paymentData.comprobante_url,
        paymentData.monto ?? 0.00,
        paymentData.cargo_id ?? null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function getPaymentDetailsWithUser(pagoId: string, condominioId: string) {
    const query = `
      SELECT
        p.id AS pago_id,
        p.monto,
        p.estatus,
        p.depto_id,
        p.cargo_id,
        d.numero_depto,
        u.nombre AS usuario_nombre,
        u.telefono_whatsapp
      FROM pagos p
      JOIN departamentos d ON p.depto_id = d.id
      JOIN depto_usuarios du ON du.depto_id = d.id
      JOIN usuarios u ON u.id = du.usuario_id
      WHERE p.id = $1 AND d.condominio_id = $2;
    `;

    const result = await pool.query(query, [pagoId, condominioId]);
    return result.rows[0] || null;
}

export async function updatePaymentStatus(pagoId: string, data: UpdatePaymentStatusDTO, condominioId: string) {
    const query = `
      UPDATE pagos
      SET estatus = $1, monto = $2
      WHERE id = $3 AND depto_id IN (SELECT id FROM departamentos WHERE condominio_id=$4)
      RETURNING *;
    `;

    const result = await pool.query(query, [data.estatus, data.monto_aprobado ?? 0.00, pagoId, condominioId]);
    return result.rows[0];
}

export async function getPendingPayments(condominioId: string) {
    const query = `
      SELECT
        p.id AS pago_id,
        p.monto,
        p.estatus,
        p.depto_id,
        p.cargo_id,
        d.numero_depto,
        COALESCE(u.nombre,principal.nombre) AS usuario_nombre,
        COALESCE(u.telefono_whatsapp,principal.telefono_whatsapp) AS telefono_whatsapp,
        p.comprobante_url,
        p.creado_en,p.metodo_pago,p.fecha_pago,p.notas,receptor.nombre receptor_nombre
      FROM pagos p
      JOIN departamentos d ON p.depto_id = d.id
      LEFT JOIN usuarios u ON u.id=p.pagador_usuario_id
      LEFT JOIN LATERAL (SELECT ux.nombre,ux.telefono_whatsapp FROM depto_usuarios dux JOIN usuarios ux ON ux.id=dux.usuario_id WHERE dux.depto_id=d.id AND ux.activo=true ORDER BY ux.nombre LIMIT 1) principal ON true
      LEFT JOIN administradores receptor ON receptor.id=p.recibido_por
      WHERE d.condominio_id = $1
      ORDER BY p.creado_en DESC;
    `;

    const result = await pool.query(query, [condominioId]);
    return Promise.all(result.rows.map(async (row) => {
        let rawUrl = row.comprobante_url || '';
        rawUrl = rawUrl.replace(/\\/g, '/');

        if (rawUrl.includes('uploads/')) {
        rawUrl = rawUrl.substring(rawUrl.indexOf('uploads/'));
        }

        return {
        ...row,
        comprobante_url: await getFileAccessUrl(rawUrl),
        creado_en: row.creado_en,
        receptor_nombre: row.receptor_nombre,
        metodo_pago: row.metodo_pago,
        fecha_pago: row.fecha_pago,
        notas: row.notas,
        };
    }));
}

export async function getCashPaymentOptions(condominioId: string) {
  const [residents, recipients] = await Promise.all([
    pool.query(`
      SELECT u.id usuario_id,u.nombre,d.id depto_id,d.numero_depto,
        COALESCE(json_agg(json_build_object('id',c.id,'concepto',COALESCE(c.concepto,c.periodo,'Cuota'),'periodo',c.periodo,'monto',c.monto) ORDER BY c.creado_en) FILTER (WHERE c.id IS NOT NULL),'[]'::json) cargos
      FROM usuarios u JOIN depto_usuarios du ON du.usuario_id=u.id JOIN departamentos d ON d.id=du.depto_id
      LEFT JOIN cargos c ON c.depto_id=d.id AND c.estado='PENDIENTE'
      WHERE d.condominio_id=$1 AND u.activo=true
      GROUP BY u.id,d.id ORDER BY d.numero_depto,u.nombre
    `, [condominioId]),
    pool.query(`SELECT id,nombre,rol FROM administradores WHERE condominio_id=$1 AND activo=true AND rol=ANY($2::varchar[]) ORDER BY nombre`, [condominioId,['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL']]),
  ]);
  return { residentes: residents.rows, receptores: recipients.rows };
}

export async function createCashPayment(input: { condominioId:string; registradoPor:string; recibidoPor:string; usuarioId:string; deptoId:string; cargoId:string; fechaPago:string; notas?:string }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recipient = await client.query(`SELECT id,nombre FROM administradores WHERE id=$1 AND condominio_id=$2 AND activo=true AND rol=ANY($3::varchar[])`, [input.recibidoPor,input.condominioId,['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL']]);
    const charge = await client.query(`
      SELECT c.id,c.monto,COALESCE(c.concepto,c.periodo,'Cuota') concepto,d.numero_depto,u.nombre usuario_nombre,u.telefono_whatsapp
      FROM cargos c JOIN departamentos d ON d.id=c.depto_id JOIN depto_usuarios du ON du.depto_id=d.id JOIN usuarios u ON u.id=du.usuario_id
      WHERE c.id=$1 AND c.depto_id=$2 AND d.condominio_id=$3 AND c.estado='PENDIENTE' AND u.id=$4 AND u.activo=true
      FOR UPDATE OF c
    `, [input.cargoId,input.deptoId,input.condominioId,input.usuarioId]);
    if (!recipient.rows[0] || !charge.rows[0]) throw new Error('Los datos del residente, cargo o receptor ya no están disponibles.');
    const row = charge.rows[0];
    const payment = await client.query(`
      INSERT INTO pagos(cargo_id,depto_id,monto,estatus,metodo_pago,fecha_pago,pagador_usuario_id,recibido_por,registrado_por,notas)
      VALUES($1,$2,$3,'APROBADO','EFECTIVO',$4,$5,$6,$7,$8) RETURNING *
    `, [input.cargoId,input.deptoId,row.monto,input.fechaPago,input.usuarioId,input.recibidoPor,input.registradoPor,input.notas||null]);
    await client.query(`UPDATE cargos SET estado='PAGADO' WHERE id=$1`, [input.cargoId]);
    await client.query('COMMIT');
    return { ...payment.rows[0], usuario_nombre: row.usuario_nombre, telefono_whatsapp: row.telefono_whatsapp, numero_depto: row.numero_depto, concepto: row.concepto, receptor_nombre: recipient.rows[0].nombre };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getPaymentSummary(condominioId: string) {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int total,
        COUNT(*) FILTER (WHERE p.estatus='PENDIENTE_REVISION')::int pendientes,
        COUNT(*) FILTER (WHERE p.estatus='APROBADO')::int aprobados,
        COUNT(*) FILTER (WHERE p.estatus='RECHAZADO')::int rechazados,
        COALESCE(SUM(p.monto) FILTER (WHERE p.estatus='APROBADO'), 0)::numeric monto_aprobado
      FROM pagos p JOIN departamentos d ON d.id=p.depto_id
      WHERE d.condominio_id=$1
    `, [condominioId]);
    return result.rows[0];
}
