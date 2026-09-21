-- Egy árlista marad: a korábbi "Mester" tartalma, Fodrász árlista néven.
-- A belső kulcs marad 'master' (a kategóriák és a régi bejegyzések erre hivatkoznak),
-- csak a felirat változik. A 'beginner' kategóriák adata megmarad, de mivel nincs
-- rá állított aktív dolgozó, a felületen nem jelenik meg.
UPDATE spellbook."User" SET "priceListType" = 'master' WHERE active;
