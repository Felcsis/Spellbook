-- Az anyagtár is árlistánként külön: a kozmetikus ne a fodrász festékeit lássa.
-- A meglévő anyagok a fodrász listán maradnak (az addigi egyetlen használó).
ALTER TABLE spellbook."Material"
  ADD COLUMN IF NOT EXISTS "priceListType" TEXT NOT NULL DEFAULT 'master';
