# Kiegészítés a foglaló tervhez

*2026-09-21. A fő terv: `foglalo-terv.html` (2026-09-17). Az ott rögzített
döntések érvényben — ez csak azt írja le, ami azóta kiderült vagy változott.*

## 1. Az élő foglalóoldal ma félrevezeti a vendéget

A `colormecrazy.hu/idopontfoglalas` oldal **kész és működőképesnek látszik**, de:

- a szabad időpontok **kitaláltak** — a `bookingData.js` 9–18 között generál sávokat,
  a „foglalt" sávokat a dátumból számolt álvéletlen adja *(a kód maga is
  PROTOTÍPUS-ként jelöli)*
- a beküldés **sehova nem megy el**: a `submit` csak annyit tesz, hogy
  `setSent(true)`, mire megjelenik a **„Megkaptuk a kérésed! Hamarosan
  visszajelzünk, és emailben megerősítjük az időpontot."** képernyő

Tehát ma egy vendég abban a hitben megy el, hogy van időpontja, és vár egy
e-mailre, ami soha nem érkezik meg.

**Ez az egyetlen dolog, ami nem várhat meg egy fejlesztési sorrendet.** A teljes
foglaló a terv szerint több fázis; addig is két lehetőség:

- **a)** a foglalás gomb helyett a Messenger/telefon kerüljön előre, a naptáras
  rész pedig „hamarosan" állapotba *(rövid módosítás)*
- **b)** az űrlap küldjön e-mailt a szalonnak, és a szöveg mondja azt, hogy
  *kérés* érkezett, nem pedig hogy az időpont megvan

Az a) biztosan nem téveszt meg senkit, a b) használható marad — de e-mail-küldés
kell hozzá, ami a 4. fázis eleme.

## 2. „Foglalható időpont berakása" — a munkaidő kevés

A fő terv a szabad időpontot a **munkaidőből** (`WorkDay.startTime/endTime`)
számolja. A szalon viszont nem akarja a teljes munkaidőt kiadni online: kell hely
beugró vendégnek, konzultációnak, szünetnek.

**Javaslat: külön „online foglalható" sáv, amit a szalon rak be.**

A mozdulat már megvan: a heti nézetben végighúzod az egérrel az idősávot — ez ma
új időpontot nyit. Ugyanez a húzás jelölhetne **online foglalható** sávot is:

```
Hétfő   9:00–13:00   online foglalható     (13–18 marad beugrónak)
Kedd    9:00–18:00   online foglalható
Szerda  —            semmi nincs kiadva
```

Ehhez egy új tábla kell (`BookableWindow`: nap, dolgozó, -tól, -ig), és a
nyilvános szabad-idő számítás **ezt** használja a munkaidő helyett. A belső
működés (munkaidő, bér, statisztika) változatlan marad.

A tömeges beállítás ugyanúgy megoldható, ahogy a munkaidőnél már működik
(napok kijelölése → egy sáv mindre), tehát a havi nyitás nem lesz napi babrálás.

**Alternatíva, ha ez sok:** marad a munkaidő, és csak egy szűkítést adunk meg
(pl. „online csak 9–16 között"). Kevesebb kontroll, viszont nincs új fogalom.

## 3. Bogi külön felhasználót kap (kozmetika)

A foglalóoldalon **két ág** van: fodrászat és kozmetika. A Spellbookban ma csak
fodrász dolgozók vannak (Felicia, Gitta; Lili archivált), és a teljes árlista
fodrász kategóriákból áll.

Ahhoz, hogy a kozmetika is foglalható legyen:

| Teendő | Megjegyzés |
|---|---|
| **Bogi felvétele dolgozóként** | staff szerepkör, a szokásos módon az adminban |
| **Kozmetika kategóriák és szolgáltatások** az árlistába | időtartammal, mert a sáv hossza abból jön |
| Bogi Google-naptárának összekötése | saját fiókkal, ahogy a többieknél |
| `onlineBookable` bekapcsolása nála | a fő tervben szereplő jelző |

Amíg ez nincs meg, a kozmetika ág maradjon üzenetes foglalás — ahogy ma is az a
szőkítés, raszta és az alkalmi konty.

**Figyelni való:** a Spellbook árlistája ma `master` / `beginner` bontású, ami a
fodrász bérszámításhoz (60/40) kötődik. A kozmetika ehhez nem illeszkedik
természetesen — az elszámolás módját Bogival előre tisztázni kell, mert az
határozza meg, hova kerüljenek a szolgáltatásai.

## 4. Amit Gittánál nem szabad elfelejteni

Gitta Google-naptára **nincs összekötve**. Minden más működik nála, de az ő
elfogadott foglalásai nem jelennek meg a Google Naptárában — márpedig a fő terv
épp arra épít, hogy a fodrász a saját naptárában lássa az időpontot. Nála ezt
előbb be kell kapcsolni, különben a foglalások észrevétlenek maradnak.
