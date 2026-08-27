ALTER TABLE administradores ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE administradores ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;
ALTER TABLE administradores ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  clave TEXT NOT NULL UNIQUE,
  nombre_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0),
  categoria VARCHAR(40) NOT NULL,
  almacenamiento VARCHAR(20) NOT NULL CHECK (almacenamiento IN ('S3', 'LOCAL')),
  subido_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archivos_condominio_categoria
  ON archivos(condominio_id, categoria, creado_en DESC);
