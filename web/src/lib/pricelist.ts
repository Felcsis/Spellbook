// Árlista-választás dátum alapján.
//
// 2026-09-01-től minden dolgozó a "master" (teljes) árlistát használja — Gitta és
// Felicia egy közös árlistán. Ez ELŐTT marad a régi szabály: a tulaj a saját munkáján
// "master", a többi (staff) "beginner". A már rögzített bejegyzések ár-snapshotjait ez
// nem érinti, tehát a múlt könyvelése változatlan.
export const PRICE_LIST_CUTOVER = "2026-09-01"; // YYYY-MM-DD, helyi nap

function ymd(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function priceListFor(
  date: Date | string | null | undefined,
  isOwnerSelf: boolean,
): "master" | "beginner" {
  const d = date ? ymd(date) : ymd(new Date());
  if (d >= PRICE_LIST_CUTOVER) return "master";
  return isOwnerSelf ? "master" : "beginner";
}
