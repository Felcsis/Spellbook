# Foglalás párban — két kolléga egy látogatásban

*Készült: 2026-09-22. A szalon kérése: a vendég Bogihoz jöjjön arckezelésre, és
utána mindjárt hajmosásra a fodrászhoz.*

## Mit lát a vendég

A foglalás végén egy kérdés: „Szeretnél utána mást is?” Ha igen, választ egy
szolgáltatást a másik kollégától, és **csak olyan időpontot kap, ahol a kettő
összeér**. Ha nincs ilyen, marad a külön kérés vagy egy másik nap.

Amit sosem látunk kifelé: kinél miért nincs hely. A válasz csak annyit mond,
mely kezdések jók mindkettőre.

## A szalon döntései

| Kérdés | Döntés | Miért |
|---|---|---|
| Ki bírálja el | **Mindkét kolléga külön** | A saját naptáráról mindenki maga dönt; a másik nevében senki ne mondjon igent |
| Ráhagyás a kettő közt | **15 perc** | Átülés, kézmosás, csúszás. Nulla perccel az első csúszása azonnal viszi a másodikat |
| Meddig érjen össze | **Legfeljebb 30 perc várakozás** | Ennél tovább ülni már nem „egy látogatás”, a vendég inkább hazamenne |

Ezek a számok a `booking-public.ts` tetején állnak, egy helyen átírhatók.

## Hogyan épül fel

A kérés **két sorra bomlik**, közös `groupId`-val: egy Bogié, egy a fodrászé.
Nem egy sor két dolgozóval — mert:

- mindkét naptárba külön kell bekerülnie,
- külön-külön kell elbírálni,
- és ha az egyiket lemondják, a másik önmagában is megállhat.

```
Booking (Bogi)     groupId: g1   status: kert       arckezelés   10:00–11:00
Booking (fodrász)  groupId: g1   status: kert       hajmosás     11:15–11:30
```

### A szabad időpontok

A kereső mindkét kollégára lefuttatja a szokásos számítást, majd azokat a
kezdéseket tartja meg, ahol a második szolgáltatás elfér az első vége + 15 perc
és + 30 perc között. A szűrés ugyanaz, mint egyébként: a kiadott sáv
szolgáltatás-szűrése mindkét oldalon érvényes.

### Elbírálás

Mindkét fél a saját kártyáját fogadja el a naptárában, és a kártyán látszik,
hogy ez egy páros kérés — különben az egyikőtök elfogadná a maga felét, a másik
meg nem tudná, hogy a vendég egyszerre kérte a kettőt.

- **Mindkettő elfogadva** → a vendég egy levelet kap, benne mindkét időponttal
- **Az egyik elutasítva** → a vendég megtudja, melyik rész maradt el; a másik áll
- **Lemondás** → a vendég a saját oldalán az egészet mondja le, mert számára egy
  látogatás volt

## Amit NEM csinálunk

- **Nem csúsztatjuk automatikusan a második időpontot**, ha az első csúszik. A
  naptárban ez kézzel áthelyezhető; az automatikus tologatás a másik kolléga
  napját írná át a háta mögött.
- **Nem kötünk össze kettőnél többet.** Egy látogatás két megállóig józan; a
  harmadiktól inkább telefonon egyeztessen a szalon.

## GDPR

Nem nyit új kérdést: ugyanazok az adatok, ugyanazok a megőrzési idők. Egyetlen
különbség, hogy **a másik kolléga is látja a vendég nevét** — de ez eddig is így
volt a közös naptárban. Külön hozzájárulás ehhez nem kell.
