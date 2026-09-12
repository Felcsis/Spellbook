# Adatkezelési tevékenységek nyilvántartása

*GDPR 30. cikk — belső dokumentum. Nem nyilvános, de egy NAIH-ellenőrzésnél ezt kell
tudni bemutatni. Ha változik a működés (új adatkör, új szolgáltató), ezt is frissíteni kell.*

| | |
|---|---|
| **Rendszer** | Salon Spellbook |
| **Utolsó frissítés** | 2026-09-05 |
| **Kitöltötte** | *[név]* |

---

## 1. Az adatkezelő

| Mező | Érték |
|---|---|
| Név | *[cégnév / e.v. neve]* |
| Székhely | *[cím]* |
| Adószám / nyilvántartási szám | *[szám]* |
| Képviselő | *[név]* |
| Kapcsolattartó adatvédelmi ügyekben | *[név, e-mail, telefon]* |
| Adatvédelmi tisztviselő | Nincs — a 37. cikk szerinti kötelező esetek egyike sem áll fenn (nem közhatalmi szerv, nem végzünk nagy számban rendszeres és szisztematikus megfigyelést, a különleges adatok kezelése nem fő tevékenység, hanem eseti és a szolgáltatáshoz kapcsolódó) |

> A fenti mezőket ki kell tölteni, és ugyanezeket az adatokat kell beállítani a
> `GDPR_CONTROLLER_*` környezeti változókban is, hogy a nyilvános tájékoztató is helyes legyen.

---

## 2. Adatkezelési tevékenységek

### 2.1 Vendégnyilvántartás és receptkönyv

| | |
|---|---|
| **Cél** | Fodrászati szolgáltatás nyújtása; a korábbi színrecept ismételhetősége; elszámolás |
| **Érintettek köre** | A szalon vendégei |
| **Adatkategóriák** | Név, telefonszám, jegyzet, látogatások dátuma, elvégzett szolgáltatások és áraik, felhasznált anyagok (márka, színkód, mennyiség), fizetett összeg |
| **Jogalap** | 6. cikk (1) b) — szerződés teljesítése |
| **Megőrzés** | Az utolsó látogatástól számított **3 év**, utána automatikus törlés (admin → Megőrzési takarítás) |
| **Címzettek** | A szalon munkatársai, feladatkörükben |
| **Adatfeldolgozó** | Railway Corp. (üzemeltetés), Google Ireland Ltd. (naptár, ha használatban) |
| **Harmadik országba továbbítás** | Igen, USA (Railway) — az Európai Bizottság által elfogadott általános szerződési feltételek (SCC) alapján |
| **Technikai és szervezési intézkedések** | HTTPS; jelszavas hozzáférés; szerepkör szerinti jogosultság (admin/staff); az adatbázis nem publikus; érintetti kérések naplózása (`GdprLog`) |

### 2.2 Egészségi adatok a vendég jegyzetében

| | |
|---|---|
| **Cél** | Egészségkárosodás megelőzése (festékallergia, sérült fejbőr, várandósság) |
| **Érintettek köre** | Azok a vendégek, akik ilyen információt megosztanak |
| **Adatkategóriák** | A `Guest.notes` mezőbe rögzített egészségi információ |
| **Jogalap** | **9. cikk (2) a) — kifejezett hozzájárulás**, a 6. cikk (1) a) mellett |
| **A hozzájárulás rögzítése** | A vendég adatlapján, „Adatvédelem" panel → *Hozzájárulás rögzítése*. A dátum és a mód a `Guest.consentAt` / `consentSource` mezőben, a művelet a `GdprLog`-ban |
| **Megőrzés** | A hozzájárulás visszavonásáig, de legfeljebb a 2.1 pont szerinti 3 évig |
| **Visszavonás** | Ugyanazon a panelen. Visszavonáskor az egészségi adatot **kézzel törölni kell a jegyzetből** — a rendszer csak a hozzájárulás tényét törli |

> **Fontos működési szabály:** egészségi információt csak akkor szabad a jegyzetbe írni,
> ha a hozzájárulás rögzítve van. A vendég adatlapján a panel figyelmeztet, ha nincs.

### 2.3 Munkatársi fiókok és munkaidő-nyilvántartás

| | |
|---|---|
| **Cél** | Belépés a rendszerbe; munkaidő-nyilvántartás; bérelszámolás |
| **Érintettek köre** | A szalon munkatársai |
| **Adatkategóriák** | Név, e-mail, jelszó (bcrypt lenyomat), szerepkör, munkanapok, érkezés/távozás időpontja, bevétel, bér, költségek |
| **Jogalap** | 6. cikk (1) b) — munkaszerződés teljesítése; 6. cikk (1) c) — jogi kötelezettség (Mt. 134. § munkaidő-nyilvántartás) |
| **Megőrzés** | A munkaviszony végéig; bérszámfejtési iratok a jogszabályi ideig. Archiváláskor a jelszó azonnal törlődik (`password = NULL`) és a sessionök megszűnnek |
| **Címzettek** | Admin szerepkörű felhasználó; könyvelő (a szalonon kívül, papíron/exportban) |

### 2.4 Számviteli bizonylatok

| | |
|---|---|
| **Cél** | Számviteli és adójogi kötelezettség teljesítése |
| **Adatkategóriák** | Bevételi és anyagköltség-tételek, összegek, dátumok |
| **Jogalap** | 6. cikk (1) c) — jogi kötelezettség; 2000. évi C. tv. 169. § |
| **Megőrzés** | **8 év** |
| **Megjegyzés** | A vendég törlésekor a hozzá tartozó `FinanceEntry.guestCardId` NULL-ra vált, így a tétel megmarad, de **már nem köthető természetes személyhez** — ezért nem ütközik a 17. cikk szerinti törlési joggal |

---

## 3. Adatfeldolgozók

| Adatfeldolgozó | Székhely | Feladat | Szerződés | Adattovábbítás EU-n kívülre |
|---|---|---|---|---|
| Railway Corp. | USA | Alkalmazás és PostgreSQL adatbázis üzemeltetése | Railway DPA — el kell fogadni a fiókban | Igen, SCC alapján |
| Google Ireland Ltd. | Írország | Naptár-szinkron (opcionális) | Google Cloud DPA | Nem |

> **Teendő élesítés előtt:** mindkét szolgáltatónál el kell fogadni / le kell tölteni a DPA-t,
> és a példányt el kell tenni ehhez a mappához.

---

## 4. Érintetti kérések kezelése

| Kérés | Hogyan teljesítjük | Határidő |
|---|---|---|
| Hozzáférés / adathordozhatóság (15., 20. cikk) | Vendégek → adott vendég → ✎ → *Adatkiadás a vendégnek (JSON)* | 1 hónap |
| Helyesbítés (16. cikk) | Vendégek → adott vendég → ✎ → mezők átírása | 1 hónap |
| Törlés (17. cikk) | Vendégek → adott vendég → ✎ → *Vendég törlése* | 1 hónap |
| Hozzájárulás visszavonása (7. cikk) | Adatvédelem panel → *Visszavonás*, majd az egészségi adat kézi törlése a jegyzetből | Azonnal |
| Korlátozás (18. cikk) | Nincs rá külön funkció — a gyakorlatban a vendég adatlapját nem használjuk tovább, amíg a vita tart. Ha rendszeresen előfordul, érdemes külön mezőt bevezetni rá | 1 hónap |

Minden teljesített kérés bekerül a **Adatvédelmi naplóba** (Admin → Adatvédelem → Adatvédelmi napló),
dátummal, a vendég nevével és azzal, hogy melyik munkatárs végezte. Ez az 5. cikk (2) szerinti
elszámoltathatóság bizonyítéka.

---

## 5. Adatvédelmi incidens

1. Az incidenst észlelő munkatárs azonnal szól az adatkezelő képviselőjének.
2. Rögzíteni kell: mikor derült ki, mi történt, mely adatkörök és hány érintett érintett, mi a várható következmény, milyen intézkedés történt.
3. **72 órán belül** bejelentés a NAIH-nak, ha az incidens kockázattal jár az érintettekre.
4. Ha az incidens **magas** kockázattal jár, az érintetteket is értesíteni kell.
5. Minden incidenst — a be nem jelentetteket is — nyilván kell tartani (33. cikk (5)).

**Incidensnapló:** *[itt vezesd, vagy hivatkozz külön fájlra — üresen is ide kell tenni]*

---

## 6. Rendszeres felülvizsgálat

| Mit | Milyen gyakran |
|---|---|
| Megőrzési takarítás lefuttatása | Negyedévente (Admin → Adatvédelem) |
| Ez a nyilvántartás | Évente, illetve minden működésbeli változáskor |
| Munkatársi hozzáférések átnézése (van-e olyan aktív fiók, aki már nem dolgozik itt) | Negyedévente |
| Biztonsági mentés (Admin → Adatexport) és a mentés biztonságos tárolása | Havonta |
