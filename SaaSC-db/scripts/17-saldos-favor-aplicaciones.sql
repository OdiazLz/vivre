ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS saldo_no_aplicado NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE pagos ADD CONSTRAINT pagos_saldo_no_aplicado_check CHECK (saldo_no_aplicado >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS aplicaciones_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE RESTRICT,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pago_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS idx_aplicaciones_pago_pago ON aplicaciones_pago(pago_id);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_pago_cargo ON aplicaciones_pago(cargo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_credito_depto
  ON pagos(depto_id, creado_en)
  WHERE estatus = 'APROBADO' AND saldo_no_aplicado > 0;

-- Conserva correctamente excedentes históricos cuando el comprobante sí estaba
-- ligado explícitamente a un cargo. Los pagos antiguos sin cargo_id permanecen
-- en cero porque no es posible reconstruir con certeza su aplicación original.
WITH pagos_ordenados AS (
  SELECT p.id pago_id,p.cargo_id,p.monto,c.monto cargo_monto,
    COALESCE(SUM(p.monto) OVER (
      PARTITION BY p.cargo_id ORDER BY p.creado_en,p.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ),0) aplicado_previamente
  FROM pagos p
  JOIN cargos c ON c.id=p.cargo_id AND c.depto_id=p.depto_id
  WHERE p.estatus='APROBADO' AND p.cargo_id IS NOT NULL AND p.monto>0
), aplicaciones AS (
  SELECT pago_id,cargo_id,LEAST(monto,GREATEST(cargo_monto-aplicado_previamente,0)) monto
  FROM pagos_ordenados
)
INSERT INTO aplicaciones_pago (pago_id, cargo_id, monto)
SELECT pago_id,cargo_id,monto FROM aplicaciones WHERE monto>0
ON CONFLICT (pago_id, cargo_id) DO NOTHING;

UPDATE pagos p
SET saldo_no_aplicado = GREATEST(p.monto - COALESCE(ap.aplicado, 0), 0)
FROM (
  SELECT pago_id, SUM(monto) aplicado
  FROM aplicaciones_pago
  GROUP BY pago_id
) ap
WHERE p.id = ap.pago_id AND p.estatus = 'APROBADO';

UPDATE cargos c
SET estado = CASE WHEN ap.aplicado >= c.monto THEN 'PAGADO' ELSE 'PENDIENTE' END
FROM (
  SELECT cargo_id,SUM(monto) aplicado
  FROM aplicaciones_pago
  GROUP BY cargo_id
) ap
WHERE c.id=ap.cargo_id;

COMMENT ON TABLE aplicaciones_pago IS 'Aplicaciones auditables de pagos a cargos; permite parcialidades y excedentes.';
COMMENT ON COLUMN pagos.saldo_no_aplicado IS 'Crédito disponible del pago para cargos futuros del mismo departamento.';
