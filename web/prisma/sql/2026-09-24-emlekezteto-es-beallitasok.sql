-- A terv 5. fázisa: emlékeztető és takarítás, plusz a szalon állítható korlátai.
ALTER TABLE spellbook."Guest"   ADD COLUMN IF NOT EXISTS "email"      TEXT;
ALTER TABLE spellbook."Booking" ADD COLUMN IF NOT EXISTS "remindedAt" TIMESTAMP(3);

-- A SalonSetting tábla már létezik egy korábbi, szalon-szintű Google-összekötés
-- idejéből (googleRefreshToken, googleCalendarId). Azok a mezők ma nincsenek
-- használatban — de nem töröljük, mert adat van bennük; a foglalás korlátait
-- ugyanebbe a sorba tesszük.
CREATE TABLE IF NOT EXISTS spellbook."SalonSetting" (
  "id"        TEXT PRIMARY KEY DEFAULT 'default',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE spellbook."SalonSetting"
  ADD COLUMN IF NOT EXISTS "bookingOpenUntil"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bookingLeadHours"   INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "bookingHorizonDays" INTEGER NOT NULL DEFAULT 60;

INSERT INTO spellbook."SalonSetting" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
