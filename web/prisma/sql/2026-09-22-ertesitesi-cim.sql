-- Dolgozónkénti értesítési cím a hozzá érkező foglalási kérésekhez.
-- A belépési cím (@salon-spellbook.local) nem valódi postafiók.
ALTER TABLE spellbook."User" ADD COLUMN IF NOT EXISTS "notifyEmail" TEXT;
