-- Előjegyzés (Appointment) — 2026-09-14
-- Additív: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-14-elojegyzes.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."Appointment" (
    "id"            TEXT NOT NULL,
    "start"         TIMESTAMP(3) NOT NULL,
    "end"           TIMESTAMP(3) NOT NULL,
    "workerId"      TEXT NOT NULL,
    "guestId"       TEXT,
    "guestName"     TEXT NOT NULL,
    "phone"         TEXT,
    "services"      TEXT,
    "notes"         TEXT,
    "status"        TEXT NOT NULL DEFAULT 'foglalt',
    "googleEventId" TEXT,
    "cardId"        TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"   TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_googleEventId_key" ON spellbook."Appointment" ("googleEventId");
CREATE INDEX IF NOT EXISTS "Appointment_start_idx"    ON spellbook."Appointment" ("start");
CREATE INDEX IF NOT EXISTS "Appointment_workerId_idx" ON spellbook."Appointment" ("workerId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_workerId_fkey') THEN
        ALTER TABLE spellbook."Appointment"
            ADD CONSTRAINT "Appointment_workerId_fkey"
            FOREIGN KEY ("workerId") REFERENCES spellbook."User"("id")
            ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
    -- A vendég törlésekor az előjegyzés megmarad, csak elveszti a kapcsolatot:
    -- a GDPR-törlés ne akadjon el egy jövőbeli időponton.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_guestId_fkey') THEN
        ALTER TABLE spellbook."Appointment"
            ADD CONSTRAINT "Appointment_guestId_fkey"
            FOREIGN KEY ("guestId") REFERENCES spellbook."Guest"("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;
