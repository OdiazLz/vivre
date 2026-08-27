BEGIN;
CREATE TABLE IF NOT EXISTS catalogo_articulos_reglamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL, nombre VARCHAR(120) NOT NULL, etiqueta VARCHAR(160) NOT NULL,
  descripcion TEXT, activo BOOLEAN NOT NULL DEFAULT TRUE, orden SMALLINT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_articulo_reglamento_global ON catalogo_articulos_reglamento(codigo) WHERE condominio_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_articulo_reglamento_condominio ON catalogo_articulos_reglamento(condominio_id,codigo) WHERE condominio_id IS NOT NULL;
INSERT INTO catalogo_articulos_reglamento(codigo,nombre,etiqueta,descripcion,orden)
SELECT item.codigo,item.nombre,item.etiqueta,item.descripcion,item.orden FROM (VALUES
  ('ART_1','Áreas Comunes','Art. 1 - Áreas Comunes','Uso y convivencia en áreas comunes',1),
  ('ART_2','Mascotas','Art. 2 - Mascotas','Censo, correa, placa y responsabilidad sobre mascotas',2),
  ('ART_3_2','Control de Accesos','Art. 3.2 - Control de Accesos','Registro y control de accesos',3),
  ('ART_4','Estacionamiento','Art. 4 - Estacionamiento','Uso de cajones y estacionamiento',4),
  ('ART_4_2','Visitas y Cajones EV','Art. 4.2 - Visitas y Cajones EV','Visitas y cajones de vehículos eléctricos',5),
  ('ART_5','Escaleras','Art. 5 - Escaleras','Seguridad y libre tránsito en escaleras',6),
  ('ART_6','Ruido','Art. 6 - Ruido','Ruido y convivencia vecinal',7),
  ('ART_6_2','Eventos','Art. 6.2 - Eventos','Horarios, ruido y registro de eventos',8)
) AS item(codigo,nombre,etiqueta,descripcion,orden)
WHERE NOT EXISTS (SELECT 1 FROM catalogo_articulos_reglamento actual WHERE actual.condominio_id IS NULL AND actual.codigo=item.codigo);
COMMIT;
