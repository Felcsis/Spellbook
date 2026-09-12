# Google Naptár összekötés

## Mit csinál

Két irányban szinkronizál, **dolgozónként külön Google-fiókkal**:

- **Google → Spellbook**: a naptáradban lévő időpontok megjelennek a Spellbook
  naptárában (hónap, hét, 3 nap, nap nézetben). Egy időpontból egy kattintással
  vendégkártya nyitható — a vendéget az esemény címe alapján keressük meg, és ha
  még nincs ilyen nevű vendég, létrehozzuk.
- **Spellbook → Google**: amikor egy munkanaphoz érkezés–távozás időt rögzítesz,
  az kikerül a naptáradba `Munka — <név>` eseményként. Ha módosítod, ugyanazt az
  eseményt frissítjük; ha kitörlöd az időket, az eseményt is töröljük.

Mindenki a saját időpontjait látja, az admin mindenkiét.

## Mit kell egyszer beállítani

1. **Google Cloud Console** → új projekt (vagy a meglévő).
2. **API-k és szolgáltatások → Könyvtár**: kapcsold be a **Google Calendar API**-t.
3. **OAuth-hozzájárulási képernyő**: külső (External), a szalon neve, a te e-mail címed.
   Amíg a projekt „tesztelés" állapotban van, a **tesztfelhasználók** közé fel kell venni
   minden dolgozó Google-fiókját, különben nem tudnak összekötni.
4. **Hitelesítő adatok → OAuth-ügyfélazonosító létrehozása → Webalkalmazás**.
   Az **engedélyezett átirányítási URI** pontosan ez legyen:

   ```
   https://spellbook.colormecrazy.hu/api/google/callback
   ```

5. A kapott azonosítót és titkot állítsd be Railway → Spellbook service:

   | Változó | Érték |
   |---|---|
   | `GOOGLE_CLIENT_ID` | az OAuth-ügyfélazonosító |
   | `GOOGLE_CLIENT_SECRET` | az ügyfél titka |
   | `GOOGLE_REDIRECT_URI` | `https://spellbook.colormecrazy.hu/api/google/callback` |

Amíg ezek nincsenek beállítva, a Google-panel meg sem jelenik az appban.

## Hogyan használod

- **Naptár** oldal tetején: *Google Naptár → Összekötés*. A Google megkérdezi, hogy
  engedélyezed-e — utána visszadob a naptárba. Minden dolgozó a saját fiókjával teszi meg.
- Az időpontok kék chipként jelennek meg a napokon.
- **+ KÁRTYA** gomb egy időponton: vendégkártya nyílik, amit a megszokott szerkesztőben
  töltesz ki. Egy időpontból csak egy kártya készülhet (♦ jelzi, ha már van).
- *Kapcsolat bontása*: a token törlődik nálunk. A hozzáférést a Google-fiókod
  biztonsági beállításaiban is visszavonhatod.

## Adatvédelem

A Google Ireland Ltd. adatfeldolgozóként szerepel az adatkezelési tájékoztatóban.
A naptárból csak azokat az időpontokat olvassuk, amelyek a megjelenített időszakba esnek,
és nem tároljuk őket — kivéve, ha vendégkártyát nyitsz belőlük.

A jogosultság, amit kérünk, `calendar.events` (esemény olvasás és írás) és az e-mail címed
— utóbbi csak azért, hogy lásd, melyik fiókkal kötötted össze.
