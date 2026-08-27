ALTER TABLE eventos ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS cancelado_en TIMESTAMP;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS origen_cancelacion VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_eventos_depto_fecha_estatus
  ON eventos(depto_id, fecha_evento, estatus);

CREATE INDEX IF NOT EXISTS idx_comunicados_tipo_fecha
  ON comunicados(condominio_id, tipo, creado_en DESC);
