BEGIN;

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS notificar_presidente_comprobante BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telefono_presidente_notificaciones VARCHAR(20);

COMMIT;
