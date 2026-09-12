# GDPR — mi hol van

| Fájl / hely | Mi ez | Kinek szól |
|---|---|---|
| `docs/gdpr/adatkezelesi-nyilvantartas.md` | A GDPR 30. cikke szerinti nyilvántartás | Belső — NAIH-ellenőrzésnél ezt kell megmutatni |
| `docs/gdpr/vendeg-tajekoztato-kinyomtathato.md` | Egyoldalas tájékoztató + hozzájárulás-nyilatkozat | Kinyomtatva a szalonban |
| `/adatkezeles` (az appban) | A teljes, nyilvános adatkezelési tájékoztató | Vendégek, munkatársak, hatóság |
| Admin → Adatvédelem | Megőrzési takarítás + adatvédelmi napló | Admin |
| Vendégek → ✎ → Adatvédelem | Hozzájárulás rögzítése, adatkiadás JSON-ban | Minden munkatárs |

## Élesítés előtti teendők

- [ ] `GDPR_CONTROLLER_*` környezeti változók kitöltése a Railway-en (`.env.example` mutatja a listát) — enélkül a `/adatkezeles` oldalon `[szögletes zárójeles]` helyőrzők látszanak
- [ ] `adatkezelesi-nyilvantartas.md` `[szögletes zárójeles]` mezőinek kitöltése
- [ ] Railway DPA elfogadása a fiókban, a példány elmentése ide
- [ ] Google Cloud DPA elfogadása, ha a naptár-szinkron használatban van
- [ ] A vendégtájékoztató kinyomtatása és kihelyezése

## Rendszeres teendők

- **Negyedévente:** Admin → Adatvédelem → *Megőrzési takarítás futtatása*
- **Negyedévente:** aktív munkatársi fiókok átnézése
- **Havonta:** Admin → Adatexport, a mentés biztonságos tárolása
- **Évente:** a nyilvántartás felülvizsgálata
