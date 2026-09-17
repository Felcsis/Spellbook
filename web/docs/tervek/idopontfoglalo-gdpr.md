# Online időpontfoglaló — GDPR-váz

*Terv, még nincs megvalósítva. Készült: 2026-09-16.*

A `colormecrazy.hu`-ra kerülő saját időpontfoglaló adatvédelmi része. A foglaló
**nem** a Salonicot integrálja, hanem egy azzal egyenértékű saját rendszer, és az
adat a Spellbook adatbázisában tárolódik, a receptkönyv mellett.

## A keretek, amiket a szalon eldöntött

| Kérdés | Döntés |
|---|---|
| Fizetés | **Nincs** — a foglalás csak időpontot rögzít, a vendég a szalonban fizet |
| Visszaigazolás | **Kézi jóváhagyás** — a foglalás „kért" állapotban érkezik |
| Kihez lehet foglalni | Végül mindhárom dolgozóhoz, de **először egy emberrel élesben tesztelve** |

Ebből következik, hogy **nem kell ÁSZF** (nincs távollévők közötti, pénzmozgással
járó szerződés) és **nem kell fizetési szolgáltató**. Ha később lesz előleg, a jogi
rész újranyílik — akkor kell ÁSZF, elállási tájékoztató és ügyvédi átnézés.

---

## 1. Mi változik a mostani állapothoz képest

Eddig a vendég adatát a szalon vitte be. Mostantól **az érintett maga adja meg egy
nyilvános űrlapon**, ami három új kötelezettséget hoz:

1. **Tájékoztatás a gyűjtés pillanatában** (13. cikk) — az űrlapnál ott kell lennie,
   ki kezeli, mire, meddig, és link a teljes tájékoztatóra.
2. **Új adatkör: e-mail cím** — a `Guest` táblában jelenleg nincs ilyen mező.
3. **Nyilvánosan írható végpont** — bárki beküldhet bármit, akár más nevében is.

## 2. Jogalap — és amit NE csináljunk

Az időpontfoglalás jogalapja a **6. cikk (1) b): szerződéskötést megelőző lépések
az érintett kérésére**. Nem hozzájárulás.

> **Ne legyen „Elfogadom az adatkezelést" kötelező pipa az űrlapon.**
> Ha hozzájárulást kérünk olyasmire, ami e nélkül is jogszerű, azzal csak annyit
> érünk el, hogy a vendég bármikor visszavonhatja — és akkor elvileg törölni kéne
> a foglalását. Rosszabb, nem jobb.

Helyette: egy mondat az űrlap alján arról, mi történik az adatával, és link a
`/adatkezeles` oldalra. Pipa nélkül.

## 3. Egészségi adat: online nem gyűjtünk

Ne legyen „Van allergiája?" mező. Az a 9. cikk szerinti különleges adat, egy
hitelesítetlen űrlapról érkezne, és DPIA-kérdéseket nyit.

Marad a jelenlegi működés: személyesen kérdezitek meg, és a Spellbookban rögzítitek
a meglévő hozzájárulás-panellel (`Guest.consentAt`).

Ha marad szabadszöveges „Megjegyzés" mező az űrlapon, oda **ki kell írni**:
*egészségi információt ne ide írjon, azt személyesen beszéljük meg.*

## 4. Kulcsdöntés: a foglalás ne legyen azonnal vendég

A beérkező foglalás **külön `Booking` táblába** kerül, és **csak a jóváhagyáskor**
keletkezik belőle `Guest`.

Miért:
- Bot vagy meggondolatlan látogató nem szemeteli tele a receptkönyvet idegenek
  nevével és telefonszámával
- A vissza nem igazolt és lemondott foglalások **gyorsan törölhetők** (90 nap),
  miközben a valódi vendégek a 3 éves szabály szerint élnek tovább
- Aki más nevében foglal rosszindulatból, nem kerül be a tartós nyilvántartásba

```
Booking          ← nyilvános űrlapból, senki nem hitelesített
  id
  token          ← kitalálhatatlan, a lemondó linkhez
  name, email, phone
  serviceId, userId (kihez), startsAt
  status: 'kért' | 'elfogadva' | 'elutasítva' | 'lemondva' | 'lezárult'
  guestId        ← csak jóváhagyáskor töltődik ki
  createdAt
```

A `Guest` táblába egyetlen új mező kell: **`email`**.

A teszt-időszakhoz kell egy **`User.onlineBookable`** jelző, hogy dolgozónként
lehessen kapcsolni, ki érhető el online.

## 4/b. Az időpontok havonta nyílnak

A szalon **havonta egyszer nyitja meg a foglalható időpontokat** (pl. szeptember
végén az októberieket), nem folyamatosan, korlátlanul előre. Ez a rendszer
szempontjából két dolgot jelent:

- Kell egy **foglalási ablak** beállítás: meddig előre lehet foglalni. Nem elég a
  dolgozónkénti `onlineBookable` jelző, kell egy „eddig a napig nyitva" dátum is.
- A levélforgalom **nem egyenletes, hanem rohamszerű**. A napi átlag félrevezető.

### Mit jelent ez a Brevo napi 300-as keretével

Legrosszabb eset a mai forgalommal (50 foglalás/hó), ha mind a nyitás napján
foglalnak:

| Mikor | Levél |
|---|---|
| Foglaláskor: „megérkezett" a vendégnek | 50 |
| Foglaláskor: „új foglalás" a szalonnak | 50 |
| Jóváhagyáskor: visszaigazolás | 50 |
| **A nyitás napján összesen** | **~150** |

Az emlékeztetők nem számítanak bele, mert szétoszlanak a hónapban.

**150 a 300-ból: belefér.** De ha a forgalom eléri a havi 100 foglalást, a nyitás
napja a határra csúszik.

**A tartalék kapcsoló, ha valaha szűk lenne:** el kell hagyni a „megérkezett"
levelet, és csak a jóváhagyáskor menjen visszaigazolás. Ez harmadával csökkenti a
rohamnapot, és a vendégnek sem rosszabb — az űrlap a képernyőn úgyis visszajelez.
Indulásnál ne így legyen: a megerősítő levél megnyugtató.

## 5. Megőrzési idők

| Mi | Meddig | Miért |
|---|---|---|
| Elutasított vagy lemondott foglalás | **90 nap**, aztán automatikus törlés | Ennyi kell a vitás esetekhez, tovább nincs rá ok |
| Beérkezett, de meg nem válaszolt foglalás | **90 nap** | Ugyanaz |
| Jóváhagyott foglalásból lett vendég | A meglévő **3 éves** szabály | Már szerződéses viszony |

A meglévő megőrzési takarítást (Admin → Adatvédelem) ki kell bővíteni erre —
ugyanaz a gomb, ugyanaz a `GdprLog` napló.

## 6. Új adatfeldolgozó: az e-mail szolgáltató

A vendég neve és e-mail címe átmegy egy külsős szolgáltatóhoz. Ez a legnagyobb új
tétel a 30. cikkes nyilvántartásban.

**EU-s székhelyű szolgáltatót érdemes választani** — ezzel megspórolható az
USA-adattovábbítás és az SCC-k témája. A Railway miatt már van egy ilyen tétel,
ne szaporítsuk. (Az árazás külön jegyzetben: `email-szolgaltato-arak.md`.)

Teendő: DPA elfogadása + a `colormecrazy.hu` domain hitelesítése (SPF/DKIM),
enélkül a visszaigazolók a spam mappába kerülnek.

## 7. Biztonsági követelmények

- **A szabad időpontokat lekérő végpont csak azt mondhatja meg, hogy foglalt-e egy
  sáv.** Vendégnevet, szolgáltatást soha nem adhat vissza — különben a nyilvános
  oldalról kiolvasható lenne, ki mikor jár a szalonba.
- **A lemondó link kitalálhatatlan tokennel** megy, nem sorszámmal. Sorszámmal
  bárki végigpróbálhatná mások foglalásait.
- **Beküldés-korlátozás** IP és e-mail szerint, hogy ne lehessen ezerszám tolni be
  foglalásokat.
- A visszaigazoló e-mail **ne tartalmazzon többet a kelleténél**: időpont,
  szolgáltatás, lemondó link. Korábbi látogatás, recept soha.

## 8. Amire nincs szükség

- **DPIA (hatásvizsgálat): nem kell**, ha az online űrlapon nincs egészségi adat.
  Nem nagy léptékű, nem szisztematikus megfigyelés, nincs automatizált döntéshozatal.
- **NAIH-regisztráció: nem létezik** 2018 óta.
- **ÁSZF: nem kell**, amíg nincs online fizetés.

## 9. Dokumentum-teendők a megvalósításkor

- [ ] `/adatkezeles` bővítése: e-mail mint adatkör, a foglalási folyamat, a 90 napos
      szabály, az e-mail szolgáltató mint adatfeldolgozó
- [ ] `adatkezelesi-nyilvantartas.md`: új szakasz a foglalásról
- [ ] `adatkezelesi-nyilvantartas.md`: **a Google-naptár szakasz frissítése** — a
      szinkron időközben dolgozónkéntivé vált (`User.googleRefreshToken`,
      `googleEmail`, `googleConnectedAt`), és vendégnevek mennek át a Google-höz.
      Ez már a foglalótól függetlenül is elavult a nyilvántartásban.
- [ ] Az űrlap alatti rövid tájékoztató szöveg megírása

## 10. Mikor kell mégis ügyvéd

Ebben a felállásban (nincs pénzmozgás) a technikai építéshez nem. Egy egyszeri
átnézés élesítés előtt viszont megéri. Ügyvéd **mindenképp kell**, ha később:

- előleget vagy foglalót kérsz online → ÁSZF, elállási tájékoztató
- hírlevelet küldesz a begyűjtött címekre → külön hozzájárulás, külön szabályok
- érvényesíthető lemondási szabályzatot akarsz (pl. no-show díj)
