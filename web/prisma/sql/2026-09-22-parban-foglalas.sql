-- Foglalás párban: a két kérés közös jele — 2026-09-22
-- Additív: egy nullázható oszlop és egy index. Meglévő foglalást nem érint.
BEGIN;
ALTER TABLE spellbook."Booking" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
CREATE INDEX IF NOT EXISTS "Booking_groupId_idx" ON spellbook."Booking" ("groupId");
COMMIT;
