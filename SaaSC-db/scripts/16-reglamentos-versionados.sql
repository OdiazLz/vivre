BEGIN;

CREATE TABLE IF NOT EXISTS reglamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  estatus VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
    CHECK (estatus IN ('BORRADOR', 'VIGENTE', 'DEROGADO')),
  vigente_desde DATE,
  vigente_hasta DATE,
  documento_key TEXT,
  documento_nombre VARCHAR(255),
  creado_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  publicado_por UUID REFERENCES administradores(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  publicado_en TIMESTAMP,
  UNIQUE (condominio_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reglamento_vigente_condominio
  ON reglamentos(condominio_id) WHERE estatus = 'VIGENTE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_reglamento_borrador_condominio
  ON reglamentos(condominio_id) WHERE estatus = 'BORRADOR';

CREATE TABLE IF NOT EXISTS reglamento_articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reglamento_id UUID NOT NULL REFERENCES reglamentos(id) ON DELETE CASCADE,
  codigo VARCHAR(30) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (reglamento_id, codigo)
);

CREATE TABLE IF NOT EXISTS reglamento_clausulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES reglamento_articulos(id) ON DELETE CASCADE,
  codigo VARCHAR(30),
  texto TEXT NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reglamentos_condominio_estatus
  ON reglamentos(condominio_id, estatus);
CREATE INDEX IF NOT EXISTS idx_reglamento_articulos_reglamento
  ON reglamento_articulos(reglamento_id, orden);
CREATE INDEX IF NOT EXISTS idx_reglamento_clausulas_articulo
  ON reglamento_clausulas(articulo_id, orden);

-- Convierte el catálogo efectivo actual de cada privada en su versión inicial.
DO $$
DECLARE
  privada RECORD;
  reglamento_id UUID;
  articulo RECORD;
  articulo_id UUID;
BEGIN
  FOR privada IN SELECT id, nombre FROM condominios LOOP
    IF NOT EXISTS (SELECT 1 FROM reglamentos WHERE condominio_id = privada.id) THEN
      INSERT INTO reglamentos(condominio_id, nombre, version, estatus, vigente_desde, publicado_en)
      VALUES (privada.id, 'Reglamento Interior de ' || privada.nombre, 1, 'VIGENTE', CURRENT_DATE, CURRENT_TIMESTAMP)
      RETURNING id INTO reglamento_id;

      FOR articulo IN
        SELECT DISTINCT ON (codigo) codigo, nombre, descripcion, orden
        FROM catalogo_articulos_reglamento
        WHERE activo = TRUE AND (condominio_id = privada.id OR condominio_id IS NULL)
        ORDER BY codigo, (condominio_id = privada.id) DESC, orden
      LOOP
        INSERT INTO reglamento_articulos(reglamento_id, codigo, titulo, orden)
        VALUES (reglamento_id, replace(regexp_replace(articulo.codigo, '^ART_', ''), '_', '.'), articulo.nombre, articulo.orden)
        RETURNING id INTO articulo_id;

        IF NULLIF(btrim(articulo.descripcion), '') IS NOT NULL THEN
          INSERT INTO reglamento_clausulas(articulo_id, codigo, texto, orden)
          VALUES (articulo_id, NULL, articulo.descripcion, 1);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

COMMIT;
