-- Foglalási kérés (Booking) — 2026-09-21
-- Additív: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-21-foglalas.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."Booking" (
    "id"            TEXT NOT NULL,
    "token"         TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "email"         TEXT NOT NULL,
    "phone"         TEXT NOT NULL,
    "note"          TEXT,
    "workerId"      TEXT NOT NULL,
    "service"       TEXT NOT NULL,
    "minutes"       INTEGER NOT NULL,
    "startsAt"      TIMESTAMP(3) NOT NULL,
    "endsAt"        TIMESTAMP(3) NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'megerosites_varo',
    "confirmedAt"   TIMESTAMP(3),
    "guestId"       TEXT,
    "googleEventId" TEXT,
    "ip"            TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_token_key"   ON spellbook."Booking" ("token");
CREATE INDEX        IF NOT EXISTS "Booking_startsAt_idx" ON spellbook."Booking" ("startsAt");
CREATE INDEX        IF NOT EXISTS "Booking_status_idx"   ON spellbook."Booking" ("status");
CREATE INDEX        IF NOT EXISTS "Booking_email_idx"    ON spellbook."Booking" ("email");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_workerId_fkey') THEN
        ALTER TABLE spellbook."Booking"
            ADD CONSTRAINT "Booking_workerId_fkey"
            FOREIGN KEY ("workerId") REFERENCES spellbook."User"("id")
            ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
    -- A vendég törlésekor a foglalás megmarad, csak elveszti a kapcsolatot:
    -- a GDPR-törlés ne akadjon el egy régi foglaláson.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_guestId_fkey') THEN
        ALTER TABLE spellbook."Booking"
            ADD CONSTRAINT "Booking_guestId_fkey"
            FOREIGN KEY ("guestId") REFERENCES spellbook."Guest"("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;
