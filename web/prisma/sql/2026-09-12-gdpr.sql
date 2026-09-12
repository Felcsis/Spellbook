-- GDPR-réteg séma-migráció (2026-09-12)
-- Additív és idempotens: nullázható oszlopok + egy új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway link --project company --environment production --service Postgres
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-12-gdpr.sql'

BEGIN;

-- Guest: hozzájárulás rögzítése (9. cikk (2) a) a jegyzetbe kerülő egészségi adatokhoz
ALTER TABLE spellbook."Guest" ADD COLUMN IF NOT EXISTS "consentAt"     TIMESTAMP(3);
ALTER TABLE spellbook."Guest" ADD COLUMN IF NOT EXISTS "consentSource" TEXT;

-- GdprLog: elszámoltathatóság (5. cikk (2)) — a vendég törlése után is megmarad
CREATE TABLE IF NOT EXISTS spellbook."GdprLog" (
    "id"         TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "subject"    TEXT NOT NULL,
    "subjectId"  TEXT,
    "detail"     TEXT,
    "actorId"    TEXT,
    "actorEmail" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GdprLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GdprLog_createdAt_idx" ON spellbook."GdprLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "GdprLog_action_idx"    ON spellbook."GdprLog" ("action");

COMMIT;
