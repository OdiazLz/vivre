CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE administradores
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRADOR';

ALTER TABLE administradores DROP CONSTRAINT IF EXISTS administradores_rol_check;
UPDATE administradores SET rol = 'TESORERO' WHERE rol = 'TESORERIA';
ALTER TABLE administradores ADD CONSTRAINT administradores_rol_check
  CHECK (rol IN ('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'));

ALTER TABLE cargos ADD COLUMN IF NOT EXISTS concepto VARCHAR(160) DEFAULT 'Cuota de mantenimiento';
CREATE INDEX IF NOT EXISTS idx_cargos_depto_periodo_concepto
  ON cargos(depto_id, periodo, concepto);

CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  categoria VARCHAR(80) NOT NULL,
  concepto VARCHAR(180) NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  comprobante_url TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estados_financieros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  periodo VARCHAR(7) NOT NULL,
  ingresos NUMERIC(12,2) NOT NULL DEFAULT 0,
  gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  fondo_disponible NUMERIC(12,2) NOT NULL DEFAULT 0,
  morosidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  departamentos_corriente INT NOT NULL DEFAULT 0,
  total_departamentos INT NOT NULL DEFAULT 0,
  detalle_gastos JSONB NOT NULL DEFAULT '[]'::jsonb,
  publicado BOOLEAN NOT NULL DEFAULT false,
  publicado_en TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(condominio_id, periodo)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  administrador_id UUID REFERENCES administradores(id) ON DELETE SET NULL,
  administrador_email VARCHAR(255),
  rol VARCHAR(20),
  accion VARCHAR(12) NOT NULL,
  modulo VARCHAR(80) NOT NULL,
  recurso VARCHAR(255) NOT NULL,
  datos JSONB,
  ip VARCHAR(80),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'AVISO',
  imagenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  enviados INT NOT NULL DEFAULT 0,
  fallidos INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enviado_en TIMESTAMP
);

ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE;
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'AVISO';
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS enviado_en TIMESTAMP;
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS enviados INT NOT NULL DEFAULT 0;
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS fallidos INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS respaldos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  archivo TEXT NOT NULL,
  estatus VARCHAR(20) NOT NULL,
  tamano_bytes BIGINT,
  error TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_condominio_fecha ON auditoria(condominio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_condominio_fecha ON gastos(condominio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_estados_condominio_periodo ON estados_financieros(condominio_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_condominio_fecha ON comunicados(condominio_id, creado_en DESC);
