ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS cajones_requeridos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_cajones_requeridos_check;
ALTER TABLE eventos ADD CONSTRAINT eventos_cajones_requeridos_check
  CHECK (cajones_requeridos BETWEEN 0 AND 20);

CREATE TABLE IF NOT EXISTS evento_cajones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  cajon_id UUID NOT NULL REFERENCES cajones_estacionamiento(id) ON DELETE RESTRICT,
  asignado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evento_id, cajon_id)
);

CREATE INDEX IF NOT EXISTS idx_evento_cajones_cajon
  ON evento_cajones(cajon_id, evento_id);
