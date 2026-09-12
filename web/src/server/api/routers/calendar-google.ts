/**
 * Spellbook → Google: a rögzített munkaidő kiküldése eseményként.
 *
 * Külön fájlban, hogy a naptár-router olvasható maradjon, és hogy a Google-hívás
 * egyértelműen "mellékhatás" legyen: ha elhasal, a munkanap mentése akkor is áll.
 */

import type { PrismaClient } from "../../../../generated/prisma";
import { isConfigured, upsertEvent, deleteEvent } from "~/server/google";

/** "HH:MM" + nap → időpont. Érvénytelen időnél null, olyankor nincs mit kiküldeni. */
function at(date: Date, hhmm: string | null): Date | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(date);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/**
 * A munkanap eseményének létrehozása vagy frissítése.
 *
 * Csak akkor küldünk ki eseményt, ha van érkezés ÉS távozás — enélkül nem lenne
 * értelmes időtartam. Ha az idők utólag kiürülnek, a korábbi eseményt töröljük.
 */
export async function pushWorkDay(
  db: PrismaClient,
  workDayId: string,
  serviceNames: string,
): Promise<void> {
  if (!isConfigured()) return;

  try {
    const wd = await db.workDay.findUnique({
      where:   { id: workDayId },
      include: { user: { select: { id: true, name: true, googleRefreshToken: true, googleCalendarId: true } } },
    });
    if (!wd?.user.googleRefreshToken) return;

    const start = at(wd.date, wd.startTime);
    const end   = at(wd.date, wd.endTime);

    if (!start || !end || end <= start) {
      if (wd.googleEventId) {
        await deleteEvent(wd.user, wd.googleEventId);
        await db.workDay.update({ where: { id: wd.id }, data: { googleEventId: null } });
      }
      return;
    }

    const eventId = await upsertEvent(wd.user, {
      eventId: wd.googleEventId,
      title:   `Munka — ${wd.user.name ?? "Spellbook"}`,
      start,
      end,
      notes:   [serviceNames, wd.notes].filter(Boolean).join("\n") || null,
    });

    if (eventId && eventId !== wd.googleEventId)
      await db.workDay.update({ where: { id: wd.id }, data: { googleEventId: eventId } });
  } catch {
    // A naptár-szinkron sosem akaszthatja meg a munkanap mentését.
  }
}
