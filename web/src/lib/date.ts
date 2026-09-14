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
