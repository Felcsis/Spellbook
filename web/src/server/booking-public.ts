/**
 * A nyilvános foglaló közös része: CORS és a szabad időpontok összeállítása.
 *
 * A válasz csak annyit mondhat, hogy egy sáv szabad-e. Vendégnevet,
 * szolgáltatást, "miért foglalt" indoklást soha nem adunk vissza — a foglalt
 * sávokból különben kiolvasható lenne, ki mikor jár a szalonba.
 */

import { db } from "~/server/db";
import { env } from "~/env";
import { isConfigured, salonAddress, send } from "~/server/email";
import { requestReceived, salonNotice } from "~/server/email-templates";
import { listEvents } from "~/server/google";
import { daySlots, toMinutes, type Busy, type Window } from "~/server/public-slots";

/** Csak a szalon saját oldala hívhatja. */
const ALLOWED = [
  "https://colormecrazy.hu",
  "https://www.colormecrazy.hu",
  "http://localhost:5173",   // fejlesztés
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0]!;
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export function json(data: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * A Spellbook saját címe, abszolút alakban — a levelek linkjeihez.
 *
 * Railway a futó szolgáltatás címét adja a `RAILWAY_PUBLIC_DOMAIN`-ben, de a
 * sajátunk szebb, ezért az `APP_URL` erősebb nála.
 */
export function appUrl(): string {
  const explicit = env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway}`;
  return "http://localhost:3000";
}

/** Mennyivel előbb és meddig előre lehet időpontot kérni. */
export const LEAD_HOURS   = 12;
export const HORIZON_DAYS = 60;
/** Ráhagyás két vendég között. */
export const BUFFER_MIN   = 10;

const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type FreeDay = { date: string; slots: string[] };

/**
 * Szabad kezdési időpontok egy dolgozóra, napokra bontva.
 *
 * Foglaltnak számít minden, ami elveheti az időt: elfogadott és megerősítésre
 * váró foglalás, a Spellbookban rögzített előjegyzés, és a dolgozó
 * Google-naptárának eseményei. A még el nem bírált kérés is blokkol — különben
 * hárman is jelentkezhetnének ugyanarra, amíg a szalon dönt.
 */
export async function freeDays(opts: {
  workerId: string;
  minutes:  number;
  from:     Date;
  days:     number;
}): Promise<FreeDay[]> {
  // A `date` oszlop naptári nap (DATE), ezért a határokat is UTC-éjfélre tesszük.
  // Helyi idejű határral az adatbázis a naphoz kerekít, és a tartomány utolsó
  // napja csendben kiesik — pont az, amelyikre a vendég foglalni akar.
  const first = new Date(Date.UTC(
    opts.from.getFullYear(), opts.from.getMonth(), opts.from.getDate(),
  ));
  const last = new Date(first);
  last.setUTCDate(last.getUTCDate() + opts.days);

  const worker = await db.user.findUnique({
    where:  { id: opts.workerId },
    select: {
      id: true, active: true, onlineBookable: true,
      googleRefreshToken: true, googleCalendarId: true,
    },
  });
  if (!worker?.active || !worker.onlineBookable) return [];

  const [windows, timeOff, appointments, bookings] = await Promise.all([
    db.bookableWindow.findMany({
      where:  { workerId: worker.id, date: { gte: first, lt: last } },
      select: { date: true, startTime: true, endTime: true },
    }),
    db.timeOff.findMany({
      where:  { date: { gte: first, lt: last }, OR: [{ workerId: worker.id }, { workerId: null }] },
      select: { date: true },
    }),
    db.appointment.findMany({
      where:  { workerId: worker.id, status: "foglalt", start: { gte: first, lt: last } },
      select: { start: true, end: true },
    }),
    db.booking.findMany({
      where: {
        workerId: worker.id,
        status:   { in: ["megerosites_varo", "kert", "elfogadva"] },
        startsAt: { gte: first, lt: last },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  if (!windows.length) return [];

  const closed = new Set(timeOff.map(t => dayKey(new Date(t.date))));

  // A Google-események naponként. Egy hiba itt ne vegye el az egész választ:
  // inkább kevesebb szabad időpontot mutassunk, mint hibát.
  let googleBusy: { start: Date; end: Date }[] = [];
  if (worker.googleRefreshToken) {
    try {
      const events = await listEvents(worker, first, last);
      googleBusy = events
        .filter(e => !e.allDay)
        .map(e => ({ start: new Date(e.start), end: new Date(e.end) }));
    } catch { /* lejárt hozzáférés — a többi adat még használható */ }
  }

  const byDay = new Map<string, Window[]>();
  for (const w of windows) {
    const key = dayKey(new Date(w.date));
    if (closed.has(key)) continue;
    const from = toMinutes(w.startTime);
    const to   = toMinutes(w.endTime);
    if (isNaN(from) || isNaN(to) || to <= from) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), { startMin: from, endMin: to }]);
  }

  const busyOf = (key: string): Busy[] => {
    const all = [
      ...appointments.map(a => ({ start: a.start, end: a.end })),
      ...bookings.map(b => ({ start: b.startsAt, end: b.endsAt })),
      ...googleBusy,
    ];
    return all
      .filter(b => localKey(b.start) === key)
      .map(b => ({
        startMin: b.start.getHours() * 60 + b.start.getMinutes(),
        endMin:   b.end.getHours() * 60 + b.end.getMinutes(),
      }));
  };

  const earliest = new Date(Date.now() + LEAD_HOURS * 3600_000);
  const out: FreeDay[] = [];

  for (const [key, wins] of [...byDay.entries()].sort()) {
    const slots = daySlots(wins, busyOf(key), {
      minutes: opts.minutes, step: 15, buffer: BUFFER_MIN,
    });

    const usable = slots.filter(min => {
      const at = new Date(`${key}T00:00:00`);
      at.setMinutes(min);
      return at >= earliest;
    });

    if (usable.length) {
      out.push({
        date: key,
        slots: usable.map(m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`),
      });
    }
  }
  return out;
}

/**
 * A vendég megerősíti, hogy övé a megadott cím.
 *
 * Csak ekkor kerül a kérés a szalon elé. Szándékosan elnéző: egy másodszor
 * megnyitott link is "rendben" választ ad, mert a vendég szemében ugyanaz
 * történt — a levelek viszont csak egyszer mennek ki.
 */
export async function confirmBooking(token: string): Promise<
  | { ok: true; alreadyDone: boolean; booking: { name: string; service: string; startsAt: Date; workerName: string } }
  | { ok: false; reason: "nincs" | "lejart" | "lemondva" }
> {
  const booking = await db.booking.findUnique({
    where:  { token },
    select: {
      id: true, name: true, email: true, service: true, minutes: true,
      startsAt: true, status: true, worker: { select: { name: true } },
    },
  });
  if (!booking) return { ok: false, reason: "nincs" };

  const info = {
    name:       booking.name,
    service:    booking.service,
    startsAt:   booking.startsAt,
    workerName: booking.worker.name ?? "",
  };

  if (booking.status === "lemondva" || booking.status === "elutasitva")
    return { ok: false, reason: "lemondva" };
  if (booking.status !== "megerosites_varo")
    return { ok: true, alreadyDone: true, booking: info };
  if (booking.startsAt < new Date())
    return { ok: false, reason: "lejart" };

  await db.booking.update({
    where: { id: booking.id },
    data:  { status: "kert", confirmedAt: new Date() },
  });

  if (isConfigured()) {
    const mail = { guestName: booking.name, service: booking.service, workerName: info.workerName, start: booking.startsAt };
    const guestMail = requestReceived(mail);
    const salon     = salonAddress();
    const salonMail = salonNotice(mail, `${appUrl()}/dashboard/calendar`);
    // A levél elakadása ne vegye el a megerősítést: a kérés már bent van.
    await Promise.allSettled([
      send({ to: { email: booking.email, name: booking.name }, subject: guestMail.subject, html: guestMail.html }),
      salon ? send({ to: { email: salon }, subject: salonMail.subject, html: salonMail.html }) : Promise.resolve(null),
    ]);
  }

  return { ok: true, alreadyDone: false, booking: info };
}
