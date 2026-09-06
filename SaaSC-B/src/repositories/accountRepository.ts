import type { PoolClient } from 'pg';

export interface AllocationSummary {
  aplicado: number;
  saldoFavor: number;
  cargosLiquidados: number;
}

const toCents = (value: unknown) => Math.round(Number(value || 0) * 100);
const fromCents = (value: number) => value / 100;

export async function applyAvailableCredit(
  client: PoolClient,
  deptoId: string,
  preferredCargoId?: string | null,
  onlyPaymentId?: string | null,
): Promise<AllocationSummary> {
  const payments = await client.query(`
    SELECT id, saldo_no_aplicado
    FROM pagos
    WHERE depto_id=$1 AND estatus='APROBADO' AND saldo_no_aplicado>0
      AND ($2::uuid IS NULL OR id=$2::uuid)
    ORDER BY creado_en, id
    FOR UPDATE
  `, [deptoId,onlyPaymentId||null]);

  const charges = await client.query(`
    SELECT c.id, c.monto,
      GREATEST(c.monto-COALESCE(ap.aplicado,0),0)::numeric saldo_pendiente
    FROM cargos c
    LEFT JOIN (
      SELECT cargo_id,SUM(monto) aplicado FROM aplicaciones_pago GROUP BY cargo_id
    ) ap ON ap.cargo_id=c.id
    WHERE c.depto_id=$1 AND c.estado='PENDIENTE'
      AND GREATEST(c.monto-COALESCE(ap.aplicado,0),0)>0
    ORDER BY CASE WHEN c.id=$2::uuid THEN 0 ELSE 1 END, c.creado_en, c.id
    FOR UPDATE OF c
  `, [deptoId, preferredCargoId || null]);

  let appliedCents = 0;
  let settledCharges = 0;
  let paymentIndex = 0;
  let paymentRemaining = payments.rows.length ? toCents(payments.rows[0].saldo_no_aplicado) : 0;

  for (const charge of charges.rows) {
    let chargeRemaining = toCents(charge.saldo_pendiente);
    while (chargeRemaining > 0 && paymentIndex < payments.rows.length) {
      if (paymentRemaining <= 0) {
        paymentIndex += 1;
        paymentRemaining = paymentIndex < payments.rows.length
          ? toCents(payments.rows[paymentIndex].saldo_no_aplicado)
          : 0;
        continue;
      }

      const amount = Math.min(chargeRemaining, paymentRemaining);
      const paymentId = payments.rows[paymentIndex].id;
      await client.query(`
        INSERT INTO aplicaciones_pago(pago_id,cargo_id,monto)
        VALUES($1,$2,$3)
        ON CONFLICT(pago_id,cargo_id) DO UPDATE
          SET monto=aplicaciones_pago.monto+EXCLUDED.monto
      `, [paymentId, charge.id, fromCents(amount)]);
      await client.query('UPDATE pagos SET saldo_no_aplicado=saldo_no_aplicado-$2 WHERE id=$1', [paymentId, fromCents(amount)]);

      chargeRemaining -= amount;
      paymentRemaining -= amount;
      appliedCents += amount;
    }

    if (chargeRemaining === 0) {
      await client.query("UPDATE cargos SET estado='PAGADO' WHERE id=$1", [charge.id]);
      settledCharges += 1;
    }
    if (paymentIndex >= payments.rows.length) break;
  }

  const credit = await client.query(`
    SELECT COALESCE(SUM(saldo_no_aplicado),0)::numeric saldo_favor
    FROM pagos WHERE depto_id=$1 AND estatus='APROBADO'
  `, [deptoId]);
  return {
    aplicado: fromCents(appliedCents),
    saldoFavor: Number(credit.rows[0]?.saldo_favor || 0),
    cargosLiquidados: settledCharges,
  };
}

export async function applyAvailableCreditForCondominium(client: PoolClient, condominioId: string) {
  const departments = await client.query(`
    SELECT DISTINCT p.depto_id
    FROM pagos p
    JOIN departamentos d ON d.id=p.depto_id
    WHERE d.condominio_id=$1 AND p.estatus='APROBADO' AND p.saldo_no_aplicado>0
  `, [condominioId]);
  for (const department of departments.rows) {
    await applyAvailableCredit(client, department.depto_id);
  }
}
