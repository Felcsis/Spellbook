import "server-only";

/**
 * Szerepkörök.
 *
 *  - `admin`    — mindent lát és kezel
 *  - `staff`    — a saját munkája: naptár, receptkönyv, pénzügyek, árlista
 *  - `calendar` — CSAK a naptár. Olyan dolgozónak, aki az időpontjait vezeti,
 *                 de a szalon pénzügyeihez és vendégkartonjaihoz nincs köze.
 */
export type Role = "admin" | "staff" | "calendar";

/** A naptáron kívül semmit nem lát. */
export function isCalendarOnly(role: string | null | undefined): boolean {
  return role === "calendar";
}

/**
 * Hova kerüljön, aki olyan oldalt nyit meg, amihez nincs joga.
 * A naptáras felhasználót a naptárra küldjük, ne egy üres irányítópultra.
 */
export function homeFor(role: string | null | undefined): string {
  return isCalendarOnly(role) ? "/dashboard/calendar" : "/dashboard";
}
