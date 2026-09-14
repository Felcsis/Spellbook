/**
 * Vendég-felismerés: melyik vendéghez tartozik egy név vagy egy recept.
 *
 * Két helyről jön a kérdés:
 *  - Google-időpont címéből ("Kovács Anna 14:00 festés") → melyik vendégünk ez
 *  - a rögzítéskor beírt szín-receptből → kinél volt már pont ilyen
 *
 * Mindkettő csak JAVASOL. A rossz találat itt drágább, mint a kihagyott találat:
 * egy téves vendéghez könyvelt festés utólag nehezen bogozható ki, ezért a
 * küszöbök inkább szigorúak.
 */

// ── név ───────────────────────────────────────────────────────────────────────

/**
 * A naptárcímekben rendszeresen ott ülő zaj, ami nem a vendég neve.
 * Szalonspecifikus: szolgáltatások, hajszínek és a szokásos töltelékszavak.
 */
const NOISE = new Set([
  // szolgáltatások
  "festes", "festeni", "hajfestes", "tofestes", "tovilagositas", "to",
  "hajvagas", "vagas", "vago", "melir", "balayage", "ombre", "babylights",
  "szokites", "toner", "pakolas", "mosas", "szarites", "szaritas", "berakas",
  "dauer", "keratin", "hajhosszabbitas", "fonas", "konty", "alkalmi", "szakall",
  "borotvalas", "gyogykezeles", "szinezes", "szin", "tincs", "modell",
  // hajszínek, jelzők — soha nem nevek
  "szoke", "barna", "fekete", "voros", "platina", "hamvas", "sotet", "vilagos",
  // töltelék
  "frizura", "konzultacio", "idopont", "vendeg", "fodrasz", "haj", "es", "plusz",
  "ora", "orakor", "delelott", "delutan",
]);

/** Ékezet nélküli, kisbetűs alak — a magyar nevek ékezetei gépelésenként eltérnek. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * A címből kiszedi a névnek látszó szavakat: ékezetet old, kidobja az időpontot,
 * a számokat, az írásjeleket és a szolgáltatás-szavakat.
 */
export function nameTokens(raw: string): string[] {
  return fold(raw)
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")   // 14:00, 9.30
    .replace(/[^a-z\s]/g, " ")               // szám, írásjel, emoji
    .split(/\s+/)
    .filter(w => w.length >= 2 && !NOISE.has(w));
}

/**
 * A naptárcímből kiszedi a vendég nevét.
 *
 * Erre azért van szükség, mert a párosítás tisztított szavakkal dolgozik, az ÚJ
 * vendég létrehozása viszont a teljes címet használta — így született a
 * "Bence modell festés , barna és szőke tincs" nevű vendég.
 *
 * A leírás jellemzően a név UTÁN jön, vesszővel vagy gondolatjellel elválasztva,
 * ezért ott elvágjuk. Magyar név legfeljebb három szó, ennél többet nem tartunk meg.
 */
export function cleanGuestName(title: string): string {
  const head = title.split(/[,(|]|\s[–—-]\s/)[0] ?? title;

  const words = head
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")               // 14:00, 9.30
    .split(/\s+/)
    .map(w => w.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, ""))   // körülvevő írásjelek
    .filter(w => w.length > 0 && !/\d/.test(w))
    .filter(w => !NOISE.has(fold(w)));

  const name = words.slice(0, 3).join(" ").trim();
  // Ha a tisztítás mindent elvitt, inkább az eredetit adjuk vissza, mint semmit.
  return name || title.trim();
}

/** Levenshtein-távolság — elgépelt neveket is meg akarunk találni. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Két szó akkor számít egyezőnek, ha rövid neveknél pontos, hosszabbaknál 1 hiba fér bele. */
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const tolerance = Math.min(a.length, b.length) >= 6 ? 1 : 0;
  return tolerance > 0 && distance(a, b) <= tolerance;
}

/**
 * Mennyire illik egy naptárcím egy vendég nevére: 0 (semmi) … 1 (teljes név egyezik).
 *
 * A vezeték+keresztnév együtt erős jel; egyetlen keresztnév gyenge, mert több
 * vendéget is hívhatnak Annának — ezért az csak javaslatnak elég, automatikus
 * párosításnak nem.
 */
export function nameScore(title: string, guestName: string): number {
  const t = nameTokens(title);
  const g = nameTokens(guestName);
  if (!t.length || !g.length) return 0;

  const hit = g.filter(gw => t.some(tw => wordsMatch(gw, tw)));
  if (!hit.length) return 0;

  const coverage = hit.length / g.length;            // a vendég nevéből mennyi van meg
  const exact    = hit.length === g.length && g.length >= 2;
  if (exact) return 1;
  if (g.length === 1 && hit.length === 1) return 0.55;  // egyetlen szavas név
  return 0.4 + coverage * 0.4;
}

/** Ennél magasabb pontszámnál merünk automatikusan meglévő vendéghez kötni. */
export const AUTO_MATCH = 0.95;
/** Ennél magasabb pontszámot már érdemes javaslatként megmutatni. */
export const SUGGEST_MIN = 0.5;

// ── szolgáltatás a naptárcímből ───────────────────────────────────────────────

export type CatalogService = {
  id:       string;
  name:     string;
  category: string;
  price:    number;
  duration: number;
};

/**
 * Melyik szolgáltatásokat említi a naptárcím ("Aliz hosszú hajvágás").
 *
 * A szabály szigorú: egy szolgáltatás csak akkor illik, ha a nevének MINDEN
 * szava szerepel a címben. Így a "hosszú hajvágás" nem hozza be a "Rövid"-et
 * vagy az "Extra hosszú"-t. Ha több marad, a kategória szavai döntenek — ez
 * választja szét a "Hosszú" hajvágást a "Hosszú" festéstől.
 *
 * Inkább ne találjon semmit, mint rosszat: a téves szolgáltatás pénzben téved.
 */
export type ServiceMatch = {
  /** Egyértelmű találat — ezt nyugodtan beírhatjuk a kártyára. */
  matched:   CatalogService[];
  /** Ugyanolyan erős, de egymást kizáró jelöltek — ezekből a felhasználó választ. */
  ambiguous: CatalogService[];
};

export function matchServices(title: string, catalog: CatalogService[]): ServiceMatch {
  const words = new Set(nameTokensRaw(title));
  const empty: ServiceMatch = { matched: [], ambiguous: [] };
  if (!words.size) return empty;

  const hits = catalog
    .map(sv => {
      const nameWords = nameTokensRaw(sv.name).filter(w => w.length >= 3);
      if (!nameWords.length) return null;
      // A név minden szava szerepeljen a címben.
      if (!nameWords.every(w => words.has(w))) return null;

      const catWords = nameTokensRaw(sv.category).filter(w => w.length >= 3);
      const catHits  = catWords.filter(w => words.has(w)).length;
      return { sv, specificity: nameWords.length, catHits };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (!hits.length) return empty;

  // A legtöbb kategória-egyezés nyer, azonosnál a részletesebb név.
  hits.sort((a, b) => b.catHits - a.catHits || b.specificity - a.specificity);
  const best   = hits[0]!;
  const chosen = hits.filter(h => h.catHits === best.catHits && h.specificity === best.specificity);

  // Ha ugyanaz a szolgáltatásnév több kategóriában is nyerne (pl. "Hosszú" a
  // női és a férfi hajvágásban is), nem tippelünk — ott az ár is eltér.
  const byName = new Map<string, CatalogService[]>();
  for (const c of chosen) {
    const key = fold(c.sv.name);
    byName.set(key, [...(byName.get(key) ?? []), c.sv]);
  }

  const matched:   CatalogService[] = [];
  const ambiguous: CatalogService[] = [];
  for (const group of byName.values()) {
    if (group.length === 1) matched.push(group[0]!);
    else ambiguous.push(...group);
  }
  return { matched, ambiguous };
}

/** Szavakra bontás ékezet nélkül — a zajszűrés NÉLKÜL, mert itt a szolgáltatás a cél. */
function nameTokensRaw(s: string): string[] {
  return fold(s)
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

// ── recept ────────────────────────────────────────────────────────────────────

export type RecipeInput = {
  materials: { name: string; brand?: string | null; colorCode?: string | null }[];
  services:  string[];
};

export type RecipeCard = {
  guestId:   string;
  guestName: string;
  date:      Date;
  materials: { name: string; brand: string | null; colorCode: string | null }[];
  services:  { name: string }[];
};

export type Suggestion = {
  guestId:   string;
  guestName: string;
  score:     number;
  reason:    string;
};

/**
 * A beírt recept alapján javasol vendéget.
 *
 * A színkód a legerősebb jel: az ritkán esetleges, és egy vendégnél hónapokon át
 * ugyanaz. Az anyag neve/márkája közepes, a szolgáltatás gyenge (mindenki festet).
 * A régebbi kártyák kevesebbet érnek, mert a szín változhat.
 */
export function suggestFromRecipe(input: RecipeInput, cards: RecipeCard[], now = new Date()): Suggestion[] {
  const codes  = new Set(input.materials.map(m => fold(m.colorCode ?? "")).filter(Boolean));
  const mats   = new Set(input.materials.map(m => fold(m.name)).filter(Boolean));
  const brands = new Set(input.materials.map(m => fold(m.brand ?? "")).filter(Boolean));
  const svcs   = new Set(input.services.map(fold).filter(Boolean));

  if (!codes.size && !mats.size && !svcs.size) return [];

  const best = new Map<string, Suggestion>();

  for (const card of cards) {
    let score = 0;
    const why: string[] = [];

    for (const m of card.materials) {
      const code = fold(m.colorCode ?? "");
      if (code && codes.has(code)) { score += 3; why.push(`${m.colorCode} színkód`); }
      if (mats.has(fold(m.name)))  { score += 1; why.push(m.name); }
      const brand = fold(m.brand ?? "");
      if (brand && brands.has(brand)) score += 0.3;
    }
    for (const s of card.services) if (svcs.has(fold(s.name))) score += 0.4;

    if (score <= 0) continue;

    // Időbeli súlyozás: egy féléves kártya feleannyit ér, mint a friss.
    const months = Math.max(0, (now.getTime() - card.date.getTime()) / (1000 * 60 * 60 * 24 * 30));
    score *= 1 / (1 + months / 6);

    const reason = why.length
      ? `${[...new Set(why)].slice(0, 2).join(", ")} — ${card.date.toLocaleDateString("hu-HU")}`
      : card.date.toLocaleDateString("hu-HU");

    const prev = best.get(card.guestId);
    if (!prev || prev.score < score)
      best.set(card.guestId, { guestId: card.guestId, guestName: card.guestName, score, reason });
  }

  return [...best.values()]
    .filter(s => s.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
