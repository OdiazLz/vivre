CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS codigos_invitacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  descripcion VARCHAR(160),
  expira_en TIMESTAMP NOT NULL,
  max_usos INT NOT NULL DEFAULT 100 CHECK (max_usos > 0),
  usos INT NOT NULL DEFAULT 0 CHECK (usos >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_invitacion_id UUID REFERENCES codigos_invitacion(id) ON DELETE SET NULL,
  telefono_whatsapp VARCHAR(20) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  numero_depto VARCHAR(20) NOT NULL,
  estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estatus IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  motivo_rechazo TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  depto_id UUID REFERENCES departamentos(id) ON DELETE SET NULL,
  revisado_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revisado_en TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_registro_pendiente
  ON solicitudes_registro(condominio_id, telefono_whatsapp)
  WHERE estatus = 'PENDIENTE';

CREATE TABLE IF NOT EXISTS sesiones_whatsapp (
  telefono_whatsapp VARCHAR(20) PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_invitacion_id UUID REFERENCES codigos_invitacion(id) ON DELETE SET NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'ACTIVA',
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  expira_en TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_codigos_invitacion_condominio
  ON codigos_invitacion(condominio_id, activo, expira_en DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_registro_condominio
  ON solicitudes_registro(condominio_id, estatus, creado_en DESC);
