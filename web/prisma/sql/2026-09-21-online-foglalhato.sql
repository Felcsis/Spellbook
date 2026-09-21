-- Ki foglalható online — 2026-09-21
-- Additív, alapértéke false: senki nem lesz automatikusan foglalható.
BEGIN;
ALTER TABLE spellbook."User"
    ADD COLUMN IF NOT EXISTS "onlineBookable" BOOLEAN NOT NULL DEFAULT false;
COMMIT;
