-- Bizonylat (nyugta / számla) tábla — 2026-09-12
-- Additív és idempotens: új tábla, meglévő adatot nem érint.
-- Futtatás prod ellen a web/ mappából:
--   railway link --project company --environment production --service Postgres
--   railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -f prisma/sql/2026-09-12-bizonylat.sql'

BEGIN;

CREATE TABLE IF NOT EXISTS spellbook."Receipt" (
    "id"            TEXT NOT NULL,
    "cardId"        TEXT,
    "kind"          TEXT NOT NULL,
    "number"        TEXT NOT NULL,
    "total"         DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "buyerName"     TEXT,
    "buyerZip"      TEXT,
    "buyerCity"     TEXT,
    "buyerAddress"  TEXT,
    "buyerEmail"    TEXT,
    "stornoNumber"  TEXT,
    "stornoedAt"    TIMESTAMP(3),
    "issuedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById"    TEXT,
    "issuedByName"  TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- A bizonylatszám egyedi: egy bizonylatot csak egyszer rögzíthetünk.
CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_number_key"   ON spellbook."Receipt" ("number");
CREATE INDEX        IF NOT EXISTS "Receipt_cardId_idx"   ON spellbook."Receipt" ("cardId");
CREATE INDEX        IF NOT EXISTS "Receipt_issuedAt_idx" ON spellbook."Receipt" ("issuedAt");

-- A vendégkártya törlésekor a bizonylat megmarad (SET NULL), mert a kiállított
-- bizonylatot jogszabály szerint nem lehet "eltüntetni".
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Receipt_cardId_fkey'
    ) THEN
        ALTER TABLE spellbook."Receipt"
            ADD CONSTRAINT "Receipt_cardId_fkey"
            FOREIGN KEY ("cardId") REFERENCES spellbook."GuestCard"("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;
