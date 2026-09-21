-- Online foglalható idősáv (BookableWindow) — 2026-09-21
-- Additív: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-21-foglalhato-sav.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."BookableWindow" (
    "id"        TEXT NOT NULL,
    "date"      DATE NOT NULL,
    "workerId"  TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookableWindow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BookableWindow_date_idx"          ON spellbook."BookableWindow" ("date");
CREATE INDEX IF NOT EXISTS "BookableWindow_workerId_date_idx" ON spellbook."BookableWindow" ("workerId", "date");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookableWindow_workerId_fkey') THEN
        ALTER TABLE spellbook."BookableWindow"
            ADD CONSTRAINT "BookableWindow_workerId_fkey"
            FOREIGN KEY ("workerId") REFERENCES spellbook."User"("id")
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
