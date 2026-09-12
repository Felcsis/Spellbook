# Nyugta és számla a Spellbookból

## Miért így

2026. szeptember 1-től kötelező a NAV felé adatot szolgáltatni a kiállított nyugtákról —
a kézzel írt és a számítógéppel készített nyugtákra egyaránt. (A NAV 2026. december 31-ig
türelmi időt ad, addig nem bírságol.)

A fodrászat (TEÁOR 96.21) **nincs** a pénztárgép-kötelezettek között, tehát nem kell
e-pénztárgépet venni: elég egy olyan számlázó szoftver, ami elvégzi az adatszolgáltatást.

Saját adatszolgáltatót azért nem építünk, mert ahhoz NAV-engedély kell, és a számlázó
programokra külön jogszabályi követelmények vonatkoznak. Ehelyett a **Számlázz.hu Számla
Agent** API-ját hívjuk: a bizonylatot ők állítják ki, és ők küldik az adatot a NAV-nak.
Nálunk csak a bizonylatszám marad meg, hogy a vendégkártyáról visszakereshető legyen.

## Mit kell egyszer beállítani

1. **Számlázz.hu fiók** (a `#free` csomag is elég — a nyugtakiállítás abban is ingyenes).
2. A fiókban **Számla Agent kulcs** igénylése.
3. A fiók **összekötése a NAV-val**: technikai felhasználó, és be kell kapcsolni a
   *"nyugtaadat-szolgáltatási interfészhez jogosultság"* jogot. Enélkül a bizonylat
   kiállítható, de az adatszolgáltatás nem megy el.
4. Railway → Spellbook service → változók:

   | Változó | Mi ez |
   |---|---|
   | `SZAMLAZZ_AGENT_KEY` | a Számla Agent kulcs (ez kapcsolja be a funkciót) |
   | `SZAMLAZZ_PREFIX` | bizonylatszám-előtag, pl. `SB` (nem kötelező) |
   | `SZAMLAZZ_VAT_KEY` | áfakulcs — alanyi adómentesnél `AAM`, ÁFA-alanynál pl. `27` |

Amíg nincs `SZAMLAZZ_AGENT_KEY`, a bizonylat-funkció nem is látszik az appban.

## Hogyan használod

**A napi munkában: Pénzügyek → Rögzítés.** A rögzítő űrlap alján ott a *Bizonylat* sor:
kiválasztod, hogy **Nyugta**, **Számla** vagy **Nem kell**, mellette a fizetési módot,
és a *Rögzítés ◈* gomb a bejegyzéssel egy mozdulatban kiállítja a bizonylatot is.
A bizonylatszám rögtön megjelenik, a nyugta PDF-je onnan letölthető.

Ha a bizonylat valamiért nem sikerül (pl. nincs net), **a bejegyzés akkor is elmentődik** —
a bizonylatot utólag a vendég kártyájáról lehet pótolni.

Utólag vagy egyedi esetben:

- **Vendégek → a vendég kártyája → lenyit → Bizonylat**
  - fizetési mód kiválasztása (készpénz / bankkártya / átutalás)
  - **Nyugta kiállítása** — ez az alapeset
  - **Számlát kér** — ilyenkor a vevő neve, irányítószáma, települése és címe kötelező
    (Áfa tv. 169. §); e-mail megadása esetén a Számlázz.hu ki is küldi neki
- A kiállított bizonylat a kártyán marad, a nyugta PDF-je bármikor letölthető.
- **Hibás bizonylatot nem lehet törölni, csak sztornózni** — a *Sztornó* gomb ezt teszi.
- **Admin → Bizonylatok**: a legutóbbi 100 bizonylat egy listában.

## Amit a bizonylat tartalmaz

A vendégkártya tételei: minden szolgáltatás egy sor, minden felhasznált anyag egy sor,
és ha volt kedvezmény, egy negatív "Kedvezmény" sor. A végösszeg így mindig megegyezik a
kártyán látható végösszeggel.

Alanyi adómentesnél (`AAM`) nincs felszámított ÁFA: a nettó és a bruttó érték azonos.

## Ami nem ez

A Spellbook nem pénztárgép és nem számlázó program — a bizonylatot minden esetben a
Számlázz.hu állítja ki, a sorszámozás is náluk fut. Ha a Spellbook nem elérhető, a
bizonylat a Számlázz.hu felületén ugyanúgy kiállítható.
