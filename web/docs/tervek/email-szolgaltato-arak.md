# E-mail szolgáltató — mennyibe kerül

*Utánanézve: 2026-09-16. Az árak változhatnak, élesítés előtt ellenőrizd.*

## Mennyi e-mailt küldenénk?

A Spellbook éles adatbázisa szerint **kb. 50 időpont/hó** a valós forgalom
(2026-06: 46, 07: 55, 08: 48, 09: 40 vendégkártya).

Foglalásonként kb. **4 e-mail**:
1. „A foglalásod megérkezett" — a vendégnek
2. „Új foglalás érkezett" — a szalonnak
3. Visszaigazolás vagy elutasítás — a vendégnek
4. Emlékeztető a időpont előtt — a vendégnek

**50 foglalás × 4 = kb. 200 e-mail/hó.** Még háromszoros növekedésnél is 600/hó,
azaz napi ~20. Ez minden szolgáltató ingyenes keretébe bőven belefér.

> **A költség tehát nem a mennyiségtől függ, hanem attól, hogy a szolgáltató
> logója rajta lehet-e az e-mailen.**

## Összehasonlítás

| Szolgáltató | Ingyenes keret | Elég nekünk? | Székhely | Logó az ingyenesen | Logó nélkül |
|---|---|---|---|---|---|
| **Brevo** | 300/nap (~9 000/hó) | bőven | Franciaország (EU) | igen, „Sent with Brevo" | +9 USD/hó add-on |
| **Mailjet** | 6 000/hó, 200/nap | bőven | Franciaország (EU) | igen | Essential, ~17–19 USD/hó |
| **Resend** | 3 000/hó, 100/nap | igen | **USA** | nincs | ingyenes marad |
| **Amazon SES** | nincs, 0,10 USD/1000 | ~0,02 USD/hó | EU régió választható (Frankfurt) | nincs | eleve nincs |

**Fenntartás a logóval kapcsolatban:** a szolgáltatók dokumentációja a kampány-
és sablonszerkesztőből küldött levelekre írja le a logó-szabályt. Hogy a saját
HTML-lel, API-n küldött tranzakciós levélre is rákerül-e, azt **egy teszt-küldéssel
kell ellenőrizni**, mielőtt bármelyikre ráállunk. A Brevo súgója a legegyértelműbb:
az ingyenes csomagon „mindig" rajta van a matrica.

## Ajánlás

**Brevo ingyenes csomag — élesben is.** EU-s, gyorsan beállítható, a napi 300 a
tízszerese a szükségesnek.

A szalon döntése (2026-09-16), hogy **a „Sent with Brevo" matrica nem zavaró** egy
időpont-visszaigazoláson. Ezzel a költség **0 Ft**, évi ~40 ezer forint megspórolva.
A logóeltávolító add-on (9 USD/hó) bármikor bekapcsolható, ha később mégis zavar —
a döntés visszafordítható.

Egyetlen fenntartás: a matrica egy link a brevo.com-ra. Tranzakciós levélnél ez
elhanyagolható. Ha valaha **marketing-célú** levél is menne (nem csak
visszaigazolás), ott már érdemes újragondolni — de akkor amúgy is más jogi
szabályok lépnek be (külön hozzájárulás).

**Az Amazon SES olcsóbb** (havi néhány forint), EU-s régióval, logó nélkül — de
AWS-fiók kell hozzá, a kezdeti „sandbox" módból külön kérvényezéssel lehet
kiengedni, és nincs hozzá kezelőfelület. A havi 9 USD megspórolásáért ez nem éri
meg egy szalonnak; akkor érdemes, ha amúgy is van AWS-fiók.

**A Resendet nem javaslom**, pedig technikailag a legkényelmesebb: amerikai, tehát
újabb EU-n kívüli adattovábbítás az SCC-papírmunkával. A Railway miatt már van egy
ilyen tételünk, ne szaporítsuk.

## Ami a pénzen túl kell

Bármelyiket választod:

- [ ] **DPA elfogadása** — ez lesz az új adatfeldolgozó a 30. cikkes nyilvántartásban
- [ ] **A `colormecrazy.hu` domain hitelesítése** (SPF + DKIM rekordok a DNS-ben).
      Enélkül a visszaigazolók a spam mappába kerülnek. A Cloudflare-en kell
      felvenni, mert a domain ott van.
- [ ] **Teszt-küldés Gmail / Freemail / Outlook címre**, mielőtt élesedik — a
      kézbesítés az, ami mindig több munka, mint elsőre látszik
- [ ] Ellenőrizni, hogy a választott csomagon **rákerül-e a logó az API-n küldött
      tranzakciós levélre**

## Források

- Brevo árazás és ingyenes keret: brevo.com/pricing, help.brevo.com
- Mailjet árazás: mailjet.com/pricing
- Resend árazás: resend.com/pricing
- Amazon SES árazás: aws.amazon.com/ses/pricing
