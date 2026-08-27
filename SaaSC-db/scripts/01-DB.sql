CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE condominios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    monto_cuota DECIMAL(10, 2) NOT NULL DEFAULT 1200.00,
    dia_corte INT DEFAULT 5,
    estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estatus IN ('ACTIVO','SUSPENDIDO')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    numero_depto VARCHAR(20) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(120) NOT NULL,
    telefono_whatsapp VARCHAR(20) UNIQUE NOT NULL, 
    rol VARCHAR(20) DEFAULT 'RESIDENTE' CHECK (rol IN ('ADMINISTRADOR', 'RESIDENTE')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE depto_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    depto_id UUID REFERENCES departamentos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE cargos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    depto_id UUID REFERENCES departamentos(id),
    periodo VARCHAR(7) NOT NULL, 
    monto DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cargo_id UUID REFERENCES cargos(id),
    depto_id UUID REFERENCES departamentos(id),
    monto DECIMAL(10, 2) NOT NULL,
    comprobante_url TEXT,
    estatus VARCHAR(20) DEFAULT 'PENDIENTE_REVISION' CHECK (estatus IN ('PENDIENTE_REVISION', 'APROBADO', 'RECHAZADO')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  foto_url VARCHAR(500),
  estatus VARCHAR(20) DEFAULT 'ABIERTO' CHECK (estatus IN ('ABIERTO', 'EN_PROCESO', 'RESUELTO')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS acceso_porton BOOLEAN DEFAULT true;
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Tabla para Censo de Mascotas (Art. 2)
CREATE TABLE IF NOT EXISTS mascotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  especie_raza VARCHAR(100) NOT NULL,
  tiene_placa BOOLEAN DEFAULT true,
  foto_url VARCHAR(500),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla para Registro de Visitas y Cajones EV (Art. 4.2)
CREATE TABLE IF NOT EXISTS visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  nombre_visitante VARCHAR(150) NOT NULL,
  placas_auto VARCHAR(20),
  cajon_asignado VARCHAR(10), -- Ej. EV1, EV2, EV3
  estatus VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estatus IN ('ACTIVA', 'FINALIZADA')),
  fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_salida TIMESTAMP
);

-- 4. Tabla para Registro de Eventos y Límite de Ruido (Art. 6.2)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  fecha_evento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estatus VARCHAR(20) DEFAULT 'APROBADO' CHECK (estatus IN ('PENDIENTE', 'APROBADO', 'CANCELADO')),
  notificacion_enviada BOOLEAN DEFAULT false,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla para Multas por Incumplimiento del Reglamento (Art. 1, 2, 5, 6)
CREATE TABLE IF NOT EXISTS multas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  articulo_reglamento VARCHAR(50) NOT NULL, -- Ej. 'Art. 2 - Mascotas'
  motivo TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  evidencia_url VARCHAR(500),
  estatus VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estatus IN ('PENDIENTE', 'PAGADA', 'CANCELADA')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Catálogo de Cajones configurados por el Condominio
CREATE TABLE IF NOT EXISTS cajones_estacionamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_cajon VARCHAR(20) NOT NULL, -- Ej. 'EV-01', 'EV-02', 'VISITA-1'
  tipo VARCHAR(20) DEFAULT 'VISITA' CHECK (tipo IN ('VISITA', 'RESIDENTE', 'DISCAPACIDAD')),
  estatus VARCHAR(20) DEFAULT 'DISPONIBLE' CHECK (estatus IN ('DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Registro de Apartados y Reservas de Cajones
CREATE TABLE IF NOT EXISTS reservas_cajones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cajon_id UUID NOT NULL REFERENCES cajones_estacionamiento(id) ON DELETE CASCADE,
  depto_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre_visitante VARCHAR(150),
  placas_auto VARCHAR(20) NOT NULL,
  estatus VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estatus IN ('ACTIVA', 'FINALIZADA', 'CANCELADA')),
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_fin TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cajones_condominio_codigo
  ON cajones_estacionamiento(condominio_id, codigo_cajon)
  WHERE condominio_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
