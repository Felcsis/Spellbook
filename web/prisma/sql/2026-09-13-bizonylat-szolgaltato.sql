-- A bizonylat szolgáltatója — 2026-09-13
-- Additív és idempotens. A meglévő sorok mind a Számlázz.hu-n készültek, ezért
-- az alapérték 'szamlazz': így a régi nyugták sztornója és PDF-je továbbra is
-- a megfelelő szolgáltatóhoz megy a Billingóra váltás után is.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-13-bizonylat-szolgaltato.sql'

BEGIN;

ALTER TABLE spellbook."Receipt"
    ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'szamlazz';
ALTER TABLE spellbook."Receipt"
    ADD COLUMN IF NOT EXISTS "externalId" TEXT;

COMMIT;
