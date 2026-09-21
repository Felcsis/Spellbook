-- "Nem vendég" naptárcímek — 2026-09-21
-- Additív: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-21-nem-vendeg.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."IgnoredEventTitle" (
    "id"        TEXT NOT NULL,
    "pattern"   TEXT NOT NULL,
    "workerId"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgnoredEventTitle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IgnoredEventTitle_workerId_idx" ON spellbook."IgnoredEventTitle" ("workerId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IgnoredEventTitle_workerId_fkey') THEN
        ALTER TABLE spellbook."IgnoredEventTitle"
            ADD CONSTRAINT "IgnoredEventTitle_workerId_fkey"
            FOREIGN KEY ("workerId") REFERENCES spellbook."User"("id")
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
