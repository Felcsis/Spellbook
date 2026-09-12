/**
 * Vendég-felismerés: melyik vendéghez tartozik egy név vagy egy recept.
 *
 * Három helyről jön a kérdés:
 *  - Google-időpont címéből ("Kovács Anna 14:00 festés") → melyik vendégünk ez
 *  - a rögzítéskor beírt szín-receptből → kinél volt már pont ilyen
 *  - esedékesség → ki jár ilyenkor
 *
 * Mindhárom csak JAVASOL. A rossz találat itt drágább, mint a kihagyott találat:
 * egy téves vendéghez könyvelt festés utólag nehezen bogozható ki, ezért a
 * küszöbök inkább szigorúak.
 */

// ── név ───────────────────────────────────────────────────────────────────────

/** A naptárcímekben rendszeresen ott ülő zaj, ami nem a vendég neve. */
const NOISE = new Set([
  "festes", "festeni", "hajvagas", "vagas", "vago", "melir", "balayage", "ombre",
  "szoke", "szokites", "toner", "pakolas", "mosas", "szarites", "berakas",
  "frizura", "konzultacio", "idopont", "vendeg", "fodrasz", "haj", "es", "plusz",
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

// ── esedékesség ───────────────────────────────────────────────────────────────

export type DueGuest = {
  guestId:     string;
  guestName:   string;
  lastVisit:   Date;
  intervalDays: number;
  dueInDays:   number;   // negatív = már késik
};

/**
 * Ki jár ilyenkor. A látogatások közti tipikus (medián) szünetből számolunk —
 * az átlagot egyetlen fél éves kihagyás is elrontaná.
 *
 * Két látogatás alatt nem tippelünk: egyetlen szünetből nem derül ki a szokás.
 */
export function dueGuests(
  visits: { guestId: string; guestName: string; date: Date }[],
  now = new Date(),
): DueGuest[] {
  const byGuest = new Map<string, { name: string; dates: Date[] }>();
  for (const v of visits) {
    const e = byGuest.get(v.guestId) ?? { name: v.guestName, dates: [] };
    e.dates.push(v.date);
    byGuest.set(v.guestId, e);
  }

  const out: DueGuest[] = [];
  for (const [guestId, { name, dates }] of byGuest) {
    if (dates.length < 3) continue;   // legalább két szünet kell a mediánhoz
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++)
      gaps.push((sorted[i]!.getTime() - sorted[i - 1]!.getTime()) / (1000 * 60 * 60 * 24));

    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)]!;
    if (median < 7 || median > 400) continue;   // életszerűtlen ritmus

    const last     = sorted[sorted.length - 1]!;
    const sinceDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    out.push({
      guestId, guestName: name, lastVisit: last,
      intervalDays: Math.round(median),
      dueInDays:    Math.round(median - sinceDays),
    });
  }

  // A legrégebben esedékes elöl.
  return out.sort((a, b) => a.dueInDays - b.dueInDays);
}
