ALTER TABLE condominios ADD COLUMN IF NOT EXISTS estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO';

DO $$ BEGIN
  ALTER TABLE condominios ADD CONSTRAINT condominios_estatus_check CHECK (estatus IN ('ACTIVO','SUSPENDIDO'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE administradores ALTER COLUMN condominio_id DROP NOT NULL;
ALTER TABLE administradores DROP CONSTRAINT IF EXISTS administradores_rol_check;
ALTER TABLE administradores ADD CONSTRAINT administradores_rol_check
  CHECK (rol IN ('SUPERADMIN','ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'));

DO $$ BEGIN
  ALTER TABLE administradores ADD CONSTRAINT administradores_superadmin_tenant_check
    CHECK ((rol='SUPERADMIN' AND condominio_id IS NULL) OR (rol<>'SUPERADMIN' AND condominio_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_condominios_estatus ON condominios(estatus);
