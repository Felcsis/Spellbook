/**
 * Havonta ismétlődő kiadások: a sablonokból létrehozza az esedékessé vált
 * havi kiadásokat.
 *
 * Kétfelől hívjuk: a kiadások listázásakor (hogy megnyitáskor mindig ott
 * legyen, ami már esedékes) és a napi karbantartásból. Többszöri, akár
 * egyidejű futás sem hoz létre duplikátumot: a (sablon, dátum) pár egyedi, és
 * a `nextDue` csak akkor lép tovább, ha közben más nem léptette.
 */
import "server-only";
import { db } from "~/server/db";
import { SALON_TZ } from "~/lib/date";

/** A mai nap a szalon időzónájában, UTC éjfélként — ahogy a `@db.Date` tárolja. */
export function salonToday(): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: SALON_TZ }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

/** A megadott nap az adott hónapban; ha a hónap rövidebb, az utolsó napja. */
export function dueDateIn(year: number, month0: number, dayOfMonth: number): Date {
  const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month0, Math.min(dayOfMonth, last)));
}

function nextMonthDue(d: Date, dayOfMonth: number): Date {
  return dueDateIn(d.getUTCFullYear(), d.getUTCMonth() + 1, dayOfMonth);
}

/** Az első esedékesség ma vagy később — szünet utáni folytatáshoz, hogy ne pótoljon. */
export function nextDueFromToday(dayOfMonth: number): Date {
  const today = salonToday();
  const d = dueDateIn(today.getUTCFullYear(), today.getUTCMonth(), dayOfMonth);
  return d >= today ? d : nextMonthDue(d, dayOfMonth);
}

// Egy régen elfelejtett sablon se gyártson végtelen sort.
const MAX_MONTHS_PER_RUN = 24;

export async function materializeRecurringExpenses(): Promise<number> {
  const today = salonToday();
  const due = await db.recurringExpense.findMany({
    where: { active: true, nextDue: { lte: today } },
  });

  let created = 0;
  for (const t of due) {
    let at = t.nextDue;
    for (let i = 0; i < MAX_MONTHS_PER_RUN && at <= today; i++) {
      const r = await db.expense.createMany({
        data: [{
          title:        t.title,
          amount:       t.amount,
          date:         at,
          category:     t.category,
          kind:         t.kind,
          notes:        t.notes,
          paid:         false,
          createdById:  t.createdById,
          assignedToId: t.assignedToId,
          recurringId:  t.id,
        }],
        skipDuplicates: true,
      });
      created += r.count;

      const next = nextMonthDue(at, t.dayOfMonth);
      const moved = await db.recurringExpense.updateMany({
        where: { id: t.id, nextDue: at },
        data:  { nextDue: next },
      });
      if (moved.count === 0) break; // egy párhuzamos futás már továbbvitte
      at = next;
    }
  }
  return created;
}
