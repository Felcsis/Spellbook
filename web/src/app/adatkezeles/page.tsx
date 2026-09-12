import type { Metadata } from "next";

// Ne épüljön be statikusan: így elég a GDPR_CONTROLLER_* env változókat átírni
// a Railway-en, nem kell újradeployolni ahhoz, hogy a cégadatok frissüljenek.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató · Salon Spellbook",
  description: "Hogyan kezeljük a vendégeink és munkatársaink személyes adatait.",
};

/**
 * Nyilvános adatkezelési tájékoztató. Bejelentkezés nélkül elérhető, mert erre
 * az URL-re kell tudni hivatkozni a vendégek felé és a hatóság felé is.
 *
 * A cégadatok környezeti változóból jönnek, hogy ne kelljen kódot módosítani,
 * ha változik a székhely vagy az e-mail cím.
 */
const controller = {
  name:    process.env.GDPR_CONTROLLER_NAME    ?? "Salon Spellbook",
  legal:   process.env.GDPR_CONTROLLER_LEGAL   ?? "[cégnév / egyéni vállalkozó neve]",
  address: process.env.GDPR_CONTROLLER_ADDRESS ?? "[székhely címe]",
  regNo:   process.env.GDPR_CONTROLLER_REGNO   ?? "[adószám / nyilvántartási szám]",
  email:   process.env.GDPR_CONTROLLER_EMAIL   ?? "[kapcsolattartó e-mail cím]",
  phone:   process.env.GDPR_CONTROLLER_PHONE   ?? "[telefonszám]",
};

const RETENTION_YEARS = 3;
const UPDATED = "2026. szeptember 5.";

export default function AdatkezelesPage() {
  return (
    <main style={styles.page}>
      <article style={styles.sheet}>
        <header style={{ marginBottom: "2.5rem" }}>
          <p style={styles.kicker}>Salon Spellbook</p>
          <h1 style={styles.h1}>Adatkezelési tájékoztató</h1>
          <p style={styles.lead}>
            Ez a tájékoztató azt írja le, milyen személyes adatokat kezelünk a szalon
            működése során, miért, meddig, és milyen jogaid vannak ezzel kapcsolatban.
          </p>
          <p style={styles.meta}>Hatályos: {UPDATED}</p>
        </header>

        <Section n="1" title="Ki kezeli az adataidat">
          <Dl rows={[
            ["Adatkezelő", controller.legal],
            ["Szolgáltatás neve", controller.name],
            ["Székhely", controller.address],
            ["Nyilvántartási szám", controller.regNo],
            ["E-mail", controller.email],
            ["Telefon", controller.phone],
          ]} />
          <P>
            Adatvédelmi tisztviselőt nem alkalmazunk, mert a tevékenységünk nem tartozik
            a GDPR 37. cikke szerinti kötelező esetek közé. Bármilyen adatvédelmi kérdéssel
            a fenti elérhetőségeken fordulhatsz hozzánk.
          </P>
        </Section>

        <Section n="2" title="Milyen adatokat kezelünk és miért">
          <h3 style={styles.h3}>Vendégként</h3>
          <Table
            head={["Adat", "Miért kezeljük", "Jogalap"]}
            rows={[
              ["Név", "A vendégkártya és a szolgáltatás azonosítása", "Szerződés teljesítése — 6. cikk (1) b)"],
              ["Telefonszám", "Időpont-egyeztetés, értesítés változásról", "Szerződés teljesítése — 6. cikk (1) b)"],
              ["Látogatások dátuma, elvégzett szolgáltatások, ár", "A szolgáltatás nyújtása és a számviteli kötelezettség", "Szerződés teljesítése, illetve jogi kötelezettség — 6. cikk (1) b) és c)"],
              ["Színrecept (használt anyagok, márka, színkód, mennyiség)", "Hogy a következő alkalommal ugyanazt az eredményt tudjuk elérni", "Szerződés teljesítése — 6. cikk (1) b)"],
              ["Jegyzet (hajtípus, preferenciák)", "A szolgáltatás személyre szabása", "Szerződés teljesítése — 6. cikk (1) b)"],
            ]}
          />

          <Callout title="Egészségi adatok — külön hozzájárulással">
            Ha a kezelés szempontjából fontos egészségi információt osztasz meg velünk
            (például festékallergia, érzékeny vagy sérült fejbőr, várandósság, bőrbetegség),
            azt a vendégkártya jegyzetében rögzítjük. Ez a GDPR 9. cikke szerinti
            <strong> különleges adat</strong>, amelyet kizárólag a <strong>kifejezett
            hozzájárulásoddal</strong> kezelünk (9. cikk (2) a) pont), abból a célból, hogy
            a kezelés ne okozzon egészségkárosodást. A hozzájárulást bármikor
            visszavonhatod — ilyenkor ezt az adatot töröljük, de a visszavonásig történt
            adatkezelés jogszerű marad. A hozzájárulás megtagadása nem akadálya annak,
            hogy igénybe vedd a szolgáltatásainkat, viszont bizonyos kezeléseket ilyenkor
            nem, vagy csak allergiateszt után tudunk elvégezni.
          </Callout>

          <h3 style={styles.h3}>Munkatársként</h3>
          <Table
            head={["Adat", "Miért kezeljük", "Jogalap"]}
            rows={[
              ["Név, e-mail cím, jelszó (titkosítva tárolva)", "Belépés a rendszerbe", "Munkaviszony teljesítése — 6. cikk (1) b)"],
              ["Munkanapok, érkezés és távozás időpontja", "Munkaidő-nyilvántartás", "Jogi kötelezettség — 6. cikk (1) c), Mt. 134. §"],
              ["Elvégzett munkák, bevétel, bér", "Elszámolás és bérszámfejtés", "Jogi kötelezettség — 6. cikk (1) c)"],
            ]}
          />
        </Section>

        <Section n="3" title="Meddig őrizzük meg">
          <Table
            head={["Adatkör", "Megőrzési idő"]}
            rows={[
              ["Vendég neve, telefonszáma, jegyzete, színreceptjei", `Az utolsó látogatástól számított ${RETENTION_YEARS} év, utána automatikusan töröljük`],
              ["Egészségi adat a jegyzetben", "A hozzájárulás visszavonásáig, de legfeljebb a fenti határidőig"],
              ["Számviteli bizonylatok, bevételi tételek", "8 év — a számvitelről szóló 2000. évi C. törvény 169. § alapján. Ezek a tételek a vendég törlése után név nélkül, személyhez nem köthetően maradnak meg."],
              ["Munkaidő- és bérnyilvántartás", "A jogszabályban előírt ideig (bérszámfejtési iratok esetén a nyugdíjjogosultság igazolásáig)"],
              ["Belépési adatok (munkatársi fiók)", "A munkaviszony végéig; a fiók archiválásakor a jelszó azonnal törlődik"],
            ]}
          />
        </Section>

        <Section n="4" title="Ki fér hozzá az adataidhoz">
          <P>
            Az adatokhoz a szalon munkatársai férnek hozzá, kizárólag a munkájuk
            elvégzéséhez szükséges mértékben. Az adatokat <strong>nem adjuk el</strong>,
            és marketingcélra nem adjuk tovább senkinek.
          </P>
          <P>A működéshez az alábbi szolgáltatókat vesszük igénybe adatfeldolgozóként:</P>
          <Table
            head={["Adatfeldolgozó", "Mit végez", "Hol tárol"]}
            rows={[
              ["Railway Corp. (USA)", "A rendszer és az adatbázis üzemeltetése", "Az Európai Unión kívül, az Európai Bizottság által elfogadott általános szerződési feltételek (SCC) alapján"],
              ["Google Ireland Ltd.", "Naptár-szinkron, ha a szalon használja", "Európai Unió"],
            ]}
          />
        </Section>

        <Section n="5" title="Milyen jogaid vannak">
          <P>
            A GDPR alapján bármikor, indokolás nélkül élhetsz az alábbi jogaiddal. A kérésedre
            legkésőbb <strong>egy hónapon belül</strong> válaszolunk, díjmentesen.
          </P>
          <Table
            head={["Jog", "Mit jelent"]}
            rows={[
              ["Hozzáférés (15. cikk)", "Kérheted, hogy adjuk ki, milyen adatokat tárolunk rólad. Ezt egy letölthető fájlban adjuk át."],
              ["Helyesbítés (16. cikk)", "Ha valamelyik adatod pontatlan vagy elavult, kérheted a javítását."],
              ["Törlés (17. cikk)", "Kérheted az adataid törlését. A számviteli bizonylatokat a törvényi határidőig meg kell őriznünk, de ezek a törlés után már nem köthetők hozzád."],
              ["Adathordozhatóság (20. cikk)", "Az adataidat géppel olvasható formában (JSON) is elkérheted, hogy máshova vihesd."],
              ["Korlátozás (18. cikk)", "Kérheted, hogy egy időre függesszük fel az adataid kezelését, például amíg vitatod a pontosságukat."],
              ["Hozzájárulás visszavonása (7. cikk)", "Az egészségi adatokra adott hozzájárulást bármikor visszavonhatod."],
              ["Tiltakozás (21. cikk)", "Tiltakozhatsz az olyan adatkezelés ellen, amely jogos érdeken alapul."],
            ]}
          />
          <P>
            A kéréseidet a <strong>{controller.email}</strong> címen vagy személyesen a
            szalonban jelezheted.
          </P>
        </Section>

        <Section n="6" title="Hogyan védjük az adataidat">
          <Ul items={[
            "A rendszer csak jelszóval, titkosított kapcsolaton (HTTPS) érhető el.",
            "A jelszavakat nem tároljuk olvasható formában, csak visszafejthetetlen lenyomatként (bcrypt).",
            "Az adatbázis nem érhető el nyilvánosan az internetről.",
            "Minden munkatárs saját fiókkal dolgozik, a kilépő munkatárs hozzáférését azonnal megszüntetjük.",
            "Az érintetti kéréseket (adatkiadás, törlés) naplózzuk, hogy igazolható legyen a teljesítésük.",
          ]} />
          <P>
            Ha mégis adatvédelmi incidens történik, azt a tudomásszerzéstől számított
            72 órán belül bejelentjük a felügyeleti hatóságnak, és ha az incidens
            magas kockázattal jár rád nézve, téged is értesítünk.
          </P>
        </Section>

        <Section n="7" title="Hova fordulhatsz panasszal">
          <P>
            Ha úgy érzed, hogy az adatkezelésünk jogsértő, kérjük, először minket keress meg —
            a legtöbb kérdés így oldódik meg a leggyorsabban. Emellett bármikor panaszt
            tehetsz a felügyeleti hatóságnál, illetve bírósághoz fordulhatsz.
          </P>
          <Dl rows={[
            ["Hatóság", "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)"],
            ["Cím", "1055 Budapest, Falk Miksa utca 9-11."],
            ["Postacím", "1363 Budapest, Pf. 9."],
            ["Telefon", "+36 1 391 1400"],
            ["E-mail", "ugyfelszolgalat@naih.hu"],
            ["Web", "naih.hu"],
          ]} />
        </Section>

        <Section n="8" title="A tájékoztató módosítása">
          <P>
            Ha a szolgáltatásunk vagy a jogszabályi környezet változik, ezt a tájékoztatót
            frissítjük. A mindenkori hatályos változat ezen az oldalon érhető el, a tetején
            feltüntetett hatálybalépési dátummal.
          </P>
        </Section>

        <footer style={styles.footer}>
          {controller.legal} · {UPDATED}
        </footer>
      </article>
    </main>
  );
}

// ── apró építőelemek ──────────────────────────────────────────────────────────

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.75rem" }}>
      <h2 style={styles.h2}>
        <span style={styles.h2num}>{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={styles.p}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={styles.ul}>
      {items.map((it) => <li key={it} style={styles.li}>{it}</li>)}
    </ul>
  );
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl style={styles.dl}>
      {rows.map(([k, v]) => (
        <div key={k} style={styles.dlRow}>
          <dt style={styles.dt}>{k}</dt>
          <dd style={styles.dd}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} style={styles.td}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside style={styles.callout}>
      <p style={styles.calloutTitle}>{title}</p>
      <p style={{ ...styles.p, margin: 0 }}>{children}</p>
    </aside>
  );
}

// ── stílus ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--color-bg)",
    padding: "clamp(1.5rem, 5vw, 4rem) 1rem",
  },
  sheet: {
    maxWidth: 780,
    margin: "0 auto",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    boxShadow: "var(--shadow-card)",
    padding: "clamp(1.5rem, 5vw, 3.5rem)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-cormorant)",
    fontSize: "1.05rem",
    lineHeight: 1.7,
  },
  kicker: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.24em",
    textTransform: "uppercase", color: "var(--color-teal)", margin: 0,
  },
  h1: {
    fontFamily: "var(--font-playfair)", fontSize: "clamp(1.7rem, 5vw, 2.4rem)",
    fontWeight: 500, margin: "0.5rem 0 0.9rem", lineHeight: 1.2,
  },
  lead: { margin: 0, color: "var(--text-muted)" },
  meta: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--text-dim)", marginTop: "1.1rem",
  },
  h2: {
    fontFamily: "var(--font-playfair)", fontSize: "1.25rem", fontWeight: 500,
    margin: "0 0 0.9rem", display: "flex", gap: "0.7rem", alignItems: "baseline",
    borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem",
  },
  h2num: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.7rem", color: "var(--color-teal)",
    letterSpacing: "0.1em",
  },
  h3: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.18em",
    textTransform: "uppercase", color: "var(--color-teal)",
    margin: "1.6rem 0 0.6rem",
  },
  p: { margin: "0 0 0.9rem", color: "var(--text-muted)" },
  ul: { margin: "0 0 0.9rem", paddingLeft: "1.2rem", color: "var(--text-muted)" },
  li: { marginBottom: "0.4rem" },
  dl: { margin: "0 0 1rem" },
  dlRow: {
    display: "flex", gap: "1rem", flexWrap: "wrap",
    padding: "0.45rem 0", borderBottom: "1px solid var(--border)",
  },
  dt: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--text-dim)",
    minWidth: 150, paddingTop: "0.25rem",
  },
  dd: { margin: 0, flex: "1 1 220px", color: "var(--text-primary)" },
  tableWrap: { overflowX: "auto", margin: "0 0 1rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", minWidth: 440 },
  th: {
    textAlign: "left", padding: "0.5rem 0.7rem",
    fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--text-dim)",
    borderBottom: "1px solid var(--border-strong)", whiteSpace: "nowrap",
  },
  td: {
    padding: "0.6rem 0.7rem", verticalAlign: "top",
    borderBottom: "1px solid var(--border)", color: "var(--text-muted)",
  },
  callout: {
    background: "var(--bg-highlight)",
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    padding: "1.1rem 1.3rem",
    margin: "1.2rem 0",
  },
  calloutTitle: {
    fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--color-teal)", margin: "0 0 0.6rem",
  },
  footer: {
    marginTop: "3rem", paddingTop: "1.2rem", borderTop: "1px solid var(--border)",
    fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--text-dim)", textAlign: "center",
  },
};
