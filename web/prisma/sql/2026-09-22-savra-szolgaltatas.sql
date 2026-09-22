-- Foglalható sáv szolgáltatás-szűrése — 2026-09-22
-- Additív: két új tömb-oszlop, üres alapértékkel. Üres = a sáv bármire kiadható,
-- tehát a meglévő sávok viselkedése nem változik.
BEGIN;
ALTER TABLE spellbook."BookableWindow"
    ADD COLUMN IF NOT EXISTS "categoryIds" TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "serviceIds"  TEXT[] NOT NULL DEFAULT '{}';
COMMIT;
