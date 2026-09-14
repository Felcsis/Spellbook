# Online időpontfoglalás — terv

*Készült: 2026-09-14. Ez terv, nem megvalósítás — a döntések a szalonra tartoznak.*

## A kiindulás: hol épüljön

Két hely jöhet szóba, és ez az első döntés, mert minden más ebből következik.

| | **Spellbook** | **booking-inbox** (külön projekt) |
|---|---|---|
| Állapot | élesben fut | nem fut élesben |
| Vendégek, szolgáltatások, árak | **megvannak** | nulláról kellene |
| Google Naptár szinkron | **kész, működik** | megírva, nem élesített |
| Dolgozók | több (Felicia, Gitta) | egy főre tervezve |
| Chat (Insta/Messenger) | nincs | ez a fő funkciója |

**Javaslat: a Spellbookba.** Az online foglalás lényege, hogy a vendég azt lássa,
ami tényleg szabad — ehhez a dolgozók munkaideje és a meglévő foglalások kellenek,
amik már a Spellbookban vannak. A booking-inboxban ezt mind újra fel kellene építeni,
és utána két rendszer versengene ugyanazért a naptárért.

A booking-inbox akkor marad értelmes, ha az **Instagram/Messenger üzenetek egy helyen
kezelése** önmagában fontos — az egy másik probléma, és a Meta App Review miatt lassú
átfutású. Ezt nem oldja meg az online foglalás, és fordítva sem.

## Mi van már kész, amire épülhet

Az alap nagyobb része megvan, ez a munka nagy részét megspórolja:

- `Appointment` modell — foglalás, áthelyezés, lemondás *(2026-09-14)*
- **szabad idő számítása** a munkaidőből és a foglalásokból (`free-slots.ts`)
- kétirányú Google Naptár szinkron, dolgozónként
- vendégek, szolgáltatások **időtartammal** (`Service.duration`) és árral
- vendég-felismerés név alapján (`guest-match.ts`) — a foglalásnál is hasznos

## Mit kell megépíteni

### 1. Nyilvános foglalóoldal
Bejelentkezés nélküli oldal (pl. `spellbook.colormecrazy.hu/foglalas`):
szolgáltatás → dolgozó (vagy „mindegy") → szabad időpont → név és telefon → visszaigazolás.

A szabad időpontokat a meglévő `freeSlots` adja. **Egy dolgot át kell rajta állítani:**
ma bejelentkezést igényel, a nyilvános oldalnak publikus végpont kell — és ott csak
annyit szabad visszaadni, hogy *melyik idősáv szabad*. A foglalt sávokból nem derülhet
ki, ki van benne: az a vendégeink adata.

### 2. Visszaélés elleni védelem
Ez nem elhagyható: nyilvános foglalás esetén bárki foglalhat bármennyit.
- telefonszám-ellenőrzés (SMS-kód) **vagy** e-mailes megerősítő link
- foglalásszám-korlát IP-nként és telefonszámonként
- előzetes időkorlát (pl. legalább 2 órával előbb, legfeljebb 2 hónapra előre)

### 3. Értesítés (ez külön döntés, lásd lentebb)
Visszaigazolás foglaláskor, emlékeztető előtte, értesítés lemondásról.

### 4. Szalon-oldali kezelés
- az online érkezett foglalás jelöltessen meg a naptárban (honnan jött)
- elfogadás/elutasítás, ha nem automatikusan erősítjük meg
- nyitva tartás és „nem foglalható" időszakok (szabadság) megadása

## Az értesítés: itt pénz van

| Csatorna | Költség | Megjegyzés |
|---|---|---|
| **E-mail** | ~0 Ft kis darabszámnál | Megbízható, de a vendégek egy része nem olvas e-mailt |
| **SMS** | kb. 8–15 Ft/db | Ezt olvassák. Havi 100 foglalásnál 1–3 000 Ft/hó |
| **Semmi** | 0 Ft | A vendég a képernyőn látja a visszaigazolást, utána telefonon egyeztettek |

Tekintve, hogy a bizonylatolást is ár miatt hagytuk ki, ezt érdemes **e-maillel kezdeni**,
és csak akkor SMS-re váltani, ha kiderül, hogy sok a meg nem jelenő vendég.

## Amit el kell dönteni, mielőtt bármi épül

1. **Automatikus vagy jóváhagyós?** Az online foglalás rögtön bekerüljön a naptárba,
   vagy előbb te hagyd jóvá? *(A jóváhagyós biztonságosabb induláshoz, de neked munka.)*
2. **Melyik szolgáltatások foglalhatók online?** Valószínűleg nem mind — egy nagy
   színváltoztatásnál konzultáció kell, azt nem érdemes automatizálni.
3. **Dolgozót választhat a vendég?** Vagy csak „bárki, aki ráér"?
4. **Mennyivel előbb?** Legkorábbi és legkésőbbi foglalható időpont.
5. **Értesítés csatornája** (lásd fent).

## GDPR

Új adatkezelés indul: a foglaló vendég neve és telefonszáma **még azelőtt** bekerül a
rendszerbe, hogy valaha járt volna nálunk. Ezért kell:
- a foglalóoldalra rövid tájékoztató + link az `/adatkezeles` oldalra
- a meg nem jelent foglalások adatainak törlése (a mostani 3 éves megőrzés
  egy sosem volt vendégnél túl hosszú)
- a `docs/gdpr/adatkezelesi-nyilvantartas.md` kiegészítése ezzel a tevékenységgel

## Nagyságrend

A már meglévő alapokra építve a nyilvános foglalóoldal + alapvető védelem + e-mailes
visszaigazolás a nagyobb rész; a finomítások (szabadság, jóváhagyás, emlékeztető)
utána jönnek. A pontos ütemezés attól függ, mennyit akarsz az első körben.

## Amit NEM javaslok

- **Fizetés/előleg online foglaláskor** — külön szolgáltató, külön díj, és a
  szalonban a meg nem jelenést jellemzően a személyes kapcsolat oldja meg jobban.
- **Naptár-megosztás linkkel Google-ből** — a vendég látná a többi vendég nevét.
