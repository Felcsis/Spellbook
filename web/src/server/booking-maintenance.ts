import "server-only";

import { db } from "~/server/db";
import { appUrl } from "~/server/booking-public";
import { isConfigured, send } from "~/server/email";
import { reminder } from "~/server/email-templates";

/**
 * Napi karbantartás a foglalásokhoz: emlékeztető és takarítás.
 *
 * Mindkettő úgy van megírva, hogy **többször is lefuthasson ugyanazon a napon**
 * anélkül, hogy kárt okozna: az emlékeztetőt a `remindedAt` jelöli megküldöttnek,
 * a takarítás pedig csak azt törli, ami már nem lehet érvényes.
 */

/** Ennyi órán belüli időpontokra megy emlékeztető. */
const REMIND_WITHIN_HOURS = 24;

/** Ennél régebbi, meg nem valósult kérést nem őrzünk. */
const KEEP_DAYS = 90;

export type MaintenanceResult = {
  reminded: number;
  remindFailed: number;
  deleted: number;
};

/**
 * Emlékeztető a holnapi vendégeknek.
 *
 * Csak elfogadott foglalásra megy, és csak egyszer. Ha a levélküldés nincs
 * beállítva, nem jelölünk semmit megküldöttnek — különben a levél csendben
 * elveszne, a rendszer meg azt hinné, elment.
 */
export async function sendReminders(now = new Date()): Promise<{ sent: number; failed: number }> {
  if (!isConfigured()) return { sent: 0, failed: 0 };

  const until = new Date(now.getTime() + REMIND_WITHIN_HOURS * 3600_000);

  const due = await db.booking.findMany({
    where: {
      status:     "elfogadva",
      remindedAt: null,
      startsAt:   { gt: now, lte: until },
    },
    select: {
      id: true, token: true, name: true, email: true,
      service: true, startsAt: true,
      worker: { select: { name: true } },
    },
  });

  let sent = 0, failed = 0;
  for (const b of due) {
    const mail = reminder({
      guestName:  b.name,
      service:    b.service,
      workerName: b.worker.name ?? "",
      start:      b.startsAt,
      link:       `${appUrl()}/foglalas/${b.token}`,
    });
    try {
      await send({ to: { email: b.email, name: b.name }, subject: mail.subject, html: mail.html });
      // Csak sikeres küldés után jelöljük — egy elakadt levél maradjon esedékes.
      await db.booking.update({ where: { id: b.id }, data: { remindedAt: new Date() } });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

/**
 * A meg nem valósult kérések törlése 90 nap után.
 *
 * Az elfogadott foglalásokat NEM bántjuk: azokból vendég és időpont lett, azok
 * megőrzését a szalon adatmegőrzési szabálya rendezi. Itt csak az marad, ami
 * sosem lett látogatás — megerősítetlen, elutasított, lemondott kérés.
 *
 * A törlés ténye bekerül az adatvédelmi naplóba: az elszámoltathatósághoz
 * bizonyíték kell arról, hogy a felesleges adat tényleg eltűnt.
 */
export async function purgeOldBookings(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000);

  const stale = await db.booking.findMany({
    where: {
      createdAt: { lt: cutoff },
      status:    { in: ["megerosites_varo", "kert", "elutasitva", "lemondva"] },
    },
    select: { id: true, name: true, status: true, startsAt: true },
  });
  if (!stale.length) return 0;

  await db.gdprLog.createMany({
    data: stale.map(b => ({
      action:  "retention",
      subject: b.name,
      detail:  `Meg nem valósult foglalás törölve ${KEEP_DAYS} nap után · ${b.status} · ${b.startsAt.toISOString().slice(0, 10)}`,
      actorId: null,
      actorEmail: "rendszer",
    })),
  });
  await db.booking.deleteMany({ where: { id: { in: stale.map(b => b.id) } } });

  return stale.length;
}

export async function runBookingMaintenance(now = new Date()): Promise<MaintenanceResult> {
  const { sent, failed } = await sendReminders(now);
  const deleted = await purgeOldBookings(now);
  return { reminded: sent, remindFailed: failed, deleted };
}
