/**
 * Szabad idő: hova fér még be vendég.
 *
 * A nyitvatartást a rögzített munkanap adja (érkezés–távozás). Ha egy napra nincs
 * munkaidő rögzítve, azt a napot nem ajánljuk fel — nem tudjuk, dolgozik-e
 * egyáltalán, és egy kitalált időpont rosszabb, mint a semmi.
 */

export type Busy = { start: Date; end: Date };

export type WorkWindow = {
  /** A nap 00:00-ja helyi időben. */
  day:   Date;
  start: string | null;   // "HH:MM"
  end:   string | null;
};

export type Slot = { start: Date; end: Date };

/** "HH:MM" + nap → időpont. Érvénytelen bemenetnél null. */
export function at(day: Date, hhmm: string | null | undefined): Date | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h   = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(day);
  d.setHours(h, min, 0, 0);
  return d;
}

/**
 * A megadott hosszúságú szabad sávok egy munkaidőn belül.
 *
 * @param step  Milyen sűrűn ajánljunk kezdést (perc). 15 perc a szokásos: a
 *              szalonok kerek negyedórákban gondolkodnak.
 */
export function freeSlots(
  window: WorkWindow,
  busy: Busy[],
  durationMinutes: number,
  step = 15,
  now = new Date(),
): Slot[] {
  const from = at(window.day, window.start);
  const to   = at(window.day, window.end);
  if (!from || !to || to <= from) return [];
  if (durationMinutes <= 0) return [];

  const needed = durationMinutes * 60_000;

  // Csak az érintett foglalások számítanak, kezdés szerint rendezve.
  const blocks = busy
    .filter(b => b.end > from && b.start < to)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: Slot[] = [];
  const stepMs = step * 60_000;

  // A kezdés mindig kerek lépésre essen, és sose a múltba.
  let cursor = new Date(Math.max(from.getTime(), roundUp(now.getTime(), stepMs)));
  if (cursor < from) cursor = new Date(from);
  cursor = new Date(roundUp(cursor.getTime(), stepMs));

  while (cursor.getTime() + needed <= to.getTime()) {
    const end   = new Date(cursor.getTime() + needed);
    const clash = blocks.find(b => b.start < end && b.end > cursor);

    if (clash) {
      // A következő lehetséges kezdés a foglalás vége utáni kerek lépés.
      cursor = new Date(roundUp(clash.end.getTime(), stepMs));
      continue;
    }
    slots.push({ start: new Date(cursor), end });
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return slots;
}

function roundUp(ms: number, stepMs: number): number {
  return Math.ceil(ms / stepMs) * stepMs;
}
