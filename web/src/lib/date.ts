/**
 * Dátum → "YYYY-MM-DD", HELYI idő szerint.
 *
 * Miért nem `toISOString().slice(0, 10)`: az UTC-re vált, és Budapesten (UTC+1/+2)
 * egy helyi éjfélkor kezdődő nap az előző UTC-napra esik. Ettől este 22:00 (télen
 * 23:00) után az egész naptár egy napot csúszott: a fejléc a helyes napot mutatta,
 * a bejegyzések viszont a szomszédos naphoz kerültek.
 *
 * Adatbázisból jövő `@db.Date` értékekre (UTC éjfél) is helyes, mert a magyar
 * időzóna az UTC-től előre van.
 */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A mai nap "YYYY-MM-DD" alakban, helyi idő szerint. */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** A szalon időzónája. A szerver UTC-ben fut, a vendég viszont itt jön be. */
export const SALON_TZ = "Europe/Budapest";

/**
 * Időpont a vendégnek: "2026. szeptember 30., szerda 10:30".
 *
 * A zónát KÖTELEZŐ megadni. Enélkül a Railway-n (UTC) futó szerver két órával
 * korábbi időt írt a megerősítő oldalra és a levelekbe — a vendég 08:30-at
 * olvasott a 10:30-as időpontja helyett.
 */
export function formatWhen(d: Date): string {
  return d.toLocaleString("hu-HU", {
    timeZone: SALON_TZ,
    year: "numeric", month: "long", day: "numeric",
    weekday: "long", hour: "2-digit", minute: "2-digit",
  });
}
