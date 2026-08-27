-- Repara datos de instalaciones antiguas cuando sólo existe un condominio.
UPDATE departamentos
SET condominio_id = (SELECT id FROM condominios LIMIT 1)
WHERE condominio_id IS NULL
  AND (SELECT COUNT(*) FROM condominios) = 1;

-- Evita que nuevos residentes, mascotas, cargos y visitas queden fuera del tenant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM departamentos WHERE condominio_id IS NULL) THEN
    ALTER TABLE departamentos ALTER COLUMN condominio_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Existen departamentos sin condominio; asígnalos manualmente antes de aplicar NOT NULL.';
  END IF;
END $$;
