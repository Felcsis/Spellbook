-- Google Naptár összekötés — 2026-09-12
-- Additív és idempotens: nullázható oszlopok, meglévő adatot nem érint.
-- A SalonSetting táblát szándékosan NEM dobjuk el: soha nem íródott bele adat,
-- de a törlés visszafordíthatatlan, a felesleges tábla pedig nem zavar semmit.
-- Futtatás prod ellen a web/ mappából:
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-12-google-naptar.sql'

BEGIN;

-- Dolgozónkénti Google-kapcsolat
ALTER TABLE spellbook."User" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE spellbook."User" ADD COLUMN IF NOT EXISTS "googleCalendarId"   TEXT;
ALTER TABLE spellbook."User" ADD COLUMN IF NOT EXISTS "googleEmail"        TEXT;
ALTER TABLE spellbook."User" ADD COLUMN IF NOT EXISTS "googleConnectedAt"  TIMESTAMP(3);

-- A munkaidőhöz kiküldött esemény azonosítója (Spellbook → Google)
ALTER TABLE spellbook."WorkDay" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;

-- Melyik Google-időpontból készült a vendégkártya (Google → Spellbook)
ALTER TABLE spellbook."GuestCard" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "GuestCard_googleEventId_key"
    ON spellbook."GuestCard" ("googleEventId");

COMMIT;
