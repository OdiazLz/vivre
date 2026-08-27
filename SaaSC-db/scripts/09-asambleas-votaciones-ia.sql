CREATE TABLE IF NOT EXISTS asambleas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  modalidad VARCHAR(20) NOT NULL DEFAULT 'HIBRIDA' CHECK (modalidad IN ('PRESENCIAL','VIRTUAL','HIBRIDA')),
  ubicacion VARCHAR(200),
  enlace_virtual TEXT,
  inicia_en TIMESTAMPTZ NOT NULL,
  cierra_en TIMESTAMPTZ NOT NULL,
  estatus VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estatus IN ('BORRADOR','ABIERTA','CERRADA','CANCELADA')),
  tipo_voto VARCHAR(25) NOT NULL DEFAULT 'POR_DEPARTAMENTO' CHECK (tipo_voto IN ('POR_DEPARTAMENTO','POR_RESIDENTE')),
  quorum_requerido NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (quorum_requerido BETWEEN 0 AND 100),
  creado_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (cierra_en > inicia_en)
);

CREATE TABLE IF NOT EXISTS preguntas_asamblea (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asamblea_id UUID NOT NULL REFERENCES asambleas(id) ON DELETE CASCADE,
  pregunta VARCHAR(300) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opciones_votacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES preguntas_asamblea(id) ON DELETE CASCADE,
  texto VARCHAR(200) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS votos_asamblea (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES preguntas_asamblea(id) ON DELETE CASCADE,
  opcion_id UUID NOT NULL REFERENCES opciones_votacion(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  depto_id UUID REFERENCES departamentos(id) ON DELETE CASCADE,
  canal VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP' CHECK (canal IN ('WHATSAPP','DASHBOARD')),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_voto_residente_pregunta
  ON votos_asamblea(pregunta_id, usuario_id) WHERE depto_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_voto_departamento_pregunta
  ON votos_asamblea(pregunta_id, depto_id) WHERE depto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asambleas_condominio_estado
  ON asambleas(condominio_id, estatus, inicia_en DESC);
