-- Migración idempotente para instalaciones existentes.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS acceso_porton BOOLEAN DEFAULT true;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS administradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_depto_usuarios_depto_id ON depto_usuarios(depto_id);
CREATE INDEX IF NOT EXISTS idx_depto_usuarios_usuario_id ON depto_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_estatus ON eventos(fecha_evento, estatus);
CREATE INDEX IF NOT EXISTS idx_visitas_estatus_cajon ON visitas(estatus, cajon_asignado);
CREATE INDEX IF NOT EXISTS idx_multas_depto_estatus ON multas(depto_id, estatus);

-- Repara cajones creados por versiones anteriores que no enviaban condominio_id.
UPDATE cajones_estacionamiento
SET condominio_id = (SELECT id FROM condominios LIMIT 1)
WHERE condominio_id IS NULL
  AND (SELECT COUNT(*) FROM condominios) = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cajones_condominio_codigo
  ON cajones_estacionamiento(condominio_id, codigo_cajon)
  WHERE condominio_id IS NOT NULL;
