import { pool } from '../db/index.js';
import { applyAvailableCreditForCondominium } from './accountRepository.js';

export async function getAccountStatement(deptoId: string) {
  const [depto, cargos, multas, pagos] = await Promise.all([
    pool.query('SELECT id, numero_depto FROM departamentos WHERE id = $1', [deptoId]),
    pool.query(`SELECT c.id,c.periodo,c.concepto,c.monto,c.estado,c.creado_en,
      COALESCE(ap.aplicado,0)::numeric monto_aplicado,
      GREATEST(c.monto-COALESCE(ap.aplicado,0),0)::numeric saldo_pendiente
      FROM cargos c LEFT JOIN (SELECT cargo_id,SUM(monto) aplicado FROM aplicaciones_pago GROUP BY cargo_id) ap ON ap.cargo_id=c.id
      WHERE c.depto_id=$1 ORDER BY c.creado_en DESC`, [deptoId]),
    pool.query(`SELECT id, articulo_reglamento, motivo, monto, estatus, creado_en FROM multas WHERE depto_id = $1 ORDER BY creado_en DESC`, [deptoId]),
    pool.query(`SELECT id,monto,estatus,saldo_no_aplicado,creado_en,
      COALESCE(SUM(saldo_no_aplicado) FILTER(WHERE estatus='APROBADO') OVER(),0)::numeric saldo_favor_total
      FROM pagos WHERE depto_id=$1 ORDER BY creado_en DESC LIMIT 20`, [deptoId]),
  ]);
  const cargosPendientes = cargos.rows.filter((item) => item.estado === 'PENDIENTE');
  const multasPendientes = multas.rows.filter((item) => item.estatus === 'PENDIENTE');
  const totalCargos = cargosPendientes.reduce((sum, item) => sum + Number(item.saldo_pendiente), 0);
  const totalMultas = multasPendientes.reduce((sum, item) => sum + Number(item.monto), 0);
  const pagosRevision = pagos.rows
    .filter((item) => item.estatus === 'PENDIENTE_REVISION')
    .reduce((sum, item) => sum + Number(item.monto), 0);
  const saldoFavor = Number(pagos.rows[0]?.saldo_favor_total || 0);
  return {
    departamento: depto.rows[0],
    total_cargos: totalCargos,
    total_multas: totalMultas,
    pagos_revision: pagosRevision,
    saldo_favor: saldoFavor,
    saldo_total: totalCargos + totalMultas,
    cargos: cargos.rows,
    multas: multas.rows,
    pagos: pagos.rows,
  };
}

export async function generateMonthlyCharges(condominioId: string, periodo?: string) {
  const target = periodo || new Date().toISOString().slice(0, 7);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Durante la configuracion inicial pudo haberse emitido una cuota en $0.
    // Sólo se corrigen cargos pendientes en cero; nunca se altera un cargo pagado
    // ni uno que ya tenga un importe contable válido.
    const repaired = await client.query(`
      UPDATE cargos cargo
      SET monto = condominio.monto_cuota
      FROM departamentos departamento
      JOIN condominios condominio ON condominio.id = departamento.condominio_id
      WHERE cargo.depto_id = departamento.id
        AND departamento.condominio_id = $1
        AND cargo.periodo = $2::varchar(7)
        AND cargo.estado = 'PENDIENTE'
        AND COALESCE(cargo.concepto, 'Cuota de mantenimiento') = 'Cuota de mantenimiento'
        AND cargo.monto = 0
        AND condominio.monto_cuota > 0
    `, [condominioId, target]);

    const inserted = await client.query(`
      INSERT INTO cargos (depto_id, periodo, monto, estado, concepto)
      SELECT d.id, $2::varchar(7), c.monto_cuota, 'PENDIENTE', 'Cuota de mantenimiento'
      FROM departamentos d
      JOIN condominios c ON c.id = d.condominio_id
      WHERE d.condominio_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM cargos existente
          WHERE existente.depto_id=d.id AND existente.periodo=$2::varchar(7)
            AND COALESCE(existente.concepto, 'Cuota de mantenimiento')='Cuota de mantenimiento'
        )
      RETURNING id;
    `, [condominioId, target]);

    await applyAvailableCreditForCondominium(client,condominioId);

    const summary = await client.query(`
      SELECT c.monto_cuota,
        COUNT(DISTINCT d.id)::int AS total_departamentos,
        COUNT(DISTINCT cargo.id)::int AS cargos_periodo
      FROM condominios c
      LEFT JOIN departamentos d ON d.condominio_id = c.id
      LEFT JOIN cargos cargo ON cargo.depto_id = d.id
        AND cargo.periodo = $2::varchar(7)
        AND COALESCE(cargo.concepto, 'Cuota de mantenimiento') = 'Cuota de mantenimiento'
      WHERE c.id = $1
      GROUP BY c.id
    `, [condominioId, target]);

    await client.query('COMMIT');
    return {
      periodo: target,
      generados: inserted.rowCount || 0,
      corregidos: repaired.rowCount || 0,
      total_departamentos: Number(summary.rows[0]?.total_departamentos || 0),
      cargos_periodo: Number(summary.rows[0]?.cargos_periodo || 0),
      monto_cuota: Number(summary.rows[0]?.monto_cuota || 0),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureMonthlyChargesDue(condominioId: string) {
  const result = await pool.query(`
    SELECT dia_corte, EXTRACT(DAY FROM CURRENT_DATE)::int AS dia_actual
    FROM condominios
    WHERE id = $1 AND estatus = 'ACTIVO'
  `, [condominioId]);
  const condominium = result.rows[0];
  if (!condominium || Number(condominium.dia_actual) < Number(condominium.dia_corte)) {
    return null;
  }
  return generateMonthlyCharges(condominioId);
}

export async function buildGeneralState(condominioId: string, periodo?: string, publish = false) {
  const target = periodo || new Date().toISOString().slice(0, 7);
  const result = await pool.query(`
    WITH ingresos AS (
      SELECT COALESCE(SUM(p.monto), 0) total FROM pagos p
      JOIN departamentos d ON d.id = p.depto_id
      WHERE d.condominio_id = $1 AND p.estatus = 'APROBADO' AND TO_CHAR(p.creado_en, 'YYYY-MM') = $2
    ), egresos AS (
      SELECT COALESCE(SUM(monto), 0) total FROM gastos WHERE condominio_id = $1 AND TO_CHAR(fecha, 'YYYY-MM') = $2
    ), fondo AS (
      SELECT
        (SELECT COALESCE(SUM(p.monto), 0) FROM pagos p JOIN departamentos d ON d.id=p.depto_id WHERE d.condominio_id=$1 AND p.estatus='APROBADO')
        - (SELECT COALESCE(SUM(g.monto), 0) FROM gastos g WHERE g.condominio_id=$1) total
    ), deuda AS (
      SELECT COALESCE(SUM(GREATEST(c.monto-COALESCE(ap.aplicado,0),0)),0)
        + COALESCE((SELECT SUM(m.monto) FROM multas m JOIN departamentos dm ON dm.id=m.depto_id WHERE dm.condominio_id=$1 AND m.estatus='PENDIENTE'),0) total
      FROM cargos c JOIN departamentos d ON d.id=c.depto_id
      LEFT JOIN (SELECT cargo_id,SUM(monto) aplicado FROM aplicaciones_pago GROUP BY cargo_id) ap ON ap.cargo_id=c.id
      WHERE d.condominio_id=$1 AND c.estado='PENDIENTE'
    ), deptos AS (
      SELECT COUNT(*) total,
        COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM cargos c WHERE c.depto_id=d.id AND c.estado='PENDIENTE')) corriente
      FROM departamentos d WHERE d.condominio_id=$1
    )
    SELECT ingresos.total ingresos, egresos.total gastos, fondo.total fondo_disponible,
      deuda.total morosidad, deptos.corriente departamentos_corriente, deptos.total total_departamentos
    FROM ingresos, egresos, fondo, deuda, deptos;
  `, [condominioId, target]);
  const categories = await pool.query(`
    SELECT categoria, SUM(monto)::numeric monto FROM gastos
    WHERE condominio_id=$1 AND TO_CHAR(fecha, 'YYYY-MM')=$2 GROUP BY categoria ORDER BY monto DESC
  `, [condominioId, target]);
  const data = { periodo: target, ...result.rows[0], detalle_gastos: categories.rows, publicado: publish };
  await pool.query(`
    INSERT INTO estados_financieros
      (condominio_id, periodo, ingresos, gastos, fondo_disponible, morosidad, departamentos_corriente, total_departamentos, detalle_gastos, publicado, publicado_en)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $10 THEN NOW() ELSE NULL END)
    ON CONFLICT (condominio_id, periodo) DO UPDATE SET
      ingresos=EXCLUDED.ingresos, gastos=EXCLUDED.gastos, fondo_disponible=EXCLUDED.fondo_disponible,
      morosidad=EXCLUDED.morosidad, departamentos_corriente=EXCLUDED.departamentos_corriente,
      total_departamentos=EXCLUDED.total_departamentos, detalle_gastos=EXCLUDED.detalle_gastos,
      publicado=CASE WHEN EXCLUDED.publicado THEN true ELSE estados_financieros.publicado END,
      publicado_en=CASE WHEN EXCLUDED.publicado THEN NOW() ELSE estados_financieros.publicado_en END
  `, [condominioId, target, data.ingresos, data.gastos, data.fondo_disponible, data.morosidad,
      data.departamentos_corriente, data.total_departamentos, JSON.stringify(categories.rows), publish]);
  return data;
}

export async function getPublishedGeneralState(condominioId: string, periodo?: string) {
  const params: unknown[] = [condominioId];
  const periodFilter = periodo ? 'AND periodo = $2' : '';
  if (periodo) params.push(periodo);
  const result = await pool.query(`
    SELECT * FROM estados_financieros WHERE condominio_id=$1 AND publicado=true ${periodFilter}
    ORDER BY periodo DESC LIMIT 1
  `, params);
  return result.rows[0] || null;
}

export async function getManagementAnalytics(condominioId: string) {
  const [parking, rules, collection, repeatOffenders] = await Promise.all([
    pool.query(`SELECT estatus, COUNT(*)::int total FROM cajones_estacionamiento WHERE condominio_id=$1 GROUP BY estatus`, [condominioId]),
    pool.query(`SELECT articulo_reglamento articulo, COUNT(*)::int incidencias, SUM(monto)::numeric monto
      FROM multas m JOIN departamentos d ON d.id=m.depto_id WHERE d.condominio_id=$1
      GROUP BY articulo_reglamento ORDER BY incidencias DESC`, [condominioId]),
    pool.query(`SELECT TO_CHAR(p.creado_en,'YYYY-MM') periodo, SUM(p.monto)::numeric total
      FROM pagos p JOIN departamentos d ON d.id=p.depto_id WHERE d.condominio_id=$1 AND p.estatus='APROBADO'
      GROUP BY periodo ORDER BY periodo DESC LIMIT 12`, [condominioId]),
    pool.query(`SELECT d.numero_depto, COUNT(*)::int total_multas,
      STRING_AGG(DISTINCT m.articulo_reglamento, ', ' ORDER BY m.articulo_reglamento) articulos
      FROM multas m JOIN departamentos d ON d.id=m.depto_id WHERE d.condominio_id=$1
      GROUP BY d.id,d.numero_depto HAVING COUNT(*) > 1 ORDER BY total_multas DESC LIMIT 10`, [condominioId]),
  ]);
  return { estacionamiento: parking.rows, reincidencias: rules.rows, reincidentes: repeatOffenders.rows, recaudacion: collection.rows.reverse() };
}
