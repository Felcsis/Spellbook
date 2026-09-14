-- Nem foglalható időszak (TimeOff) — 2026-09-14
-- Additív: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-14-szabadsag.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."TimeOff" (
    "id"        TEXT NOT NULL,
    "date"      DATE NOT NULL,
    "workerId"  TEXT,
    "reason"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- Egy napra dolgozónként egy sor. A NULL workerId (egész szalon) a Postgresben
-- nem ütközik önmagával, ezért arra külön részleges index kell.
CREATE UNIQUE INDEX IF NOT EXISTS "TimeOff_date_workerId_key"
    ON spellbook."TimeOff" ("date", "workerId") WHERE "workerId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "TimeOff_date_salon_key"
    ON spellbook."TimeOff" ("date") WHERE "workerId" IS NULL;
CREATE INDEX IF NOT EXISTS "TimeOff_date_idx" ON spellbook."TimeOff" ("date");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimeOff_workerId_fkey') THEN
        ALTER TABLE spellbook."TimeOff"
            ADD CONSTRAINT "TimeOff_workerId_fkey"
            FOREIGN KEY ("workerId") REFERENCES spellbook."User"("id")
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
