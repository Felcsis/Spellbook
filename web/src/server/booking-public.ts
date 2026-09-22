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

/**
 * Nyitva van-e az online foglalás.
 *
 * Amíg a foglalóoldal nincs kész, senki ne tudjon időpontot kérni — a
 * végpontok akkor is elérhetők kívülről, ha a weboldal nem hivatkozik rájuk.
 */
export function bookingOpen(): boolean {
  return (env.BOOKING_OPEN ?? "").trim().toLowerCase() === "true";
}

/** Zárt állapotban ezt kapja minden nyilvános foglalási hívás. */
export function closedResponse(origin: string | null): Response {
  return json(
    { error: "Az online időpontfoglalás még nem indult el. Kérünk, hívj minket telefonon." },
    origin,
    503,
  );
}

/**
 * "2026-09-30T10:30" → az a pillanat, amikor Szegeden 10:30 van.
 *
 * A böngészőből kapott időpontot NEM bízhatjuk a `new Date()`-re: zóna nélküli
 * szövegnél az a szerver zónáját veszi, az pedig UTC — így a 10:30-ból 12:30
 * lenne. A vendég böngészője sem jó alap: külföldről nézve más zónában jár.
 * A szalon ideje a mérvadó, mert a vendég ide jön be.
 */
export function fromSalonLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];

  const offsetAt = (t: number) => {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
      .formatToParts(new Date(t)).find(p => p.type === "timeZoneName")?.value ?? "GMT+00:00";
    const om = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
    if (!om) return 0;
    const sign = om[1] === "-" ? -1 : 1;
    return sign * (Number(om[2]) * 60 + Number(om[3])) * 60_000;
  };

  const naive = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  // Kétszer: az óraátállítás napján az első becslés még a régi eltolást kapná.
  let t = naive - offsetAt(naive);
  t = naive - offsetAt(t);
  const out = new Date(t);
  return isNaN(out.getTime()) ? null : out;
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

/**
 * Párban kért foglalás: a vendég két kollégához jön egy látogatásban.
 *
 * `PAIR_GAP_MIN` a legkisebb szünet a kettő közt — átülés, kézmosás, csúszás.
 * Nulla perccel az első apró csúszása azonnal vinné a másodikat is.
 * `PAIR_MAX_WAIT_MIN` a legtöbb, amennyit a vendéget várakoztatjuk: ennél
 * tovább ülni már nem egy látogatás.
 */
export const PAIR_GAP_MIN      = 15;
export const PAIR_MAX_WAIT_MIN = 30;

const TZ = "Europe/Budapest";

/**
 * Dátum és óra a szalon időzónájában.
 *
 * A szerver UTC-ben fut, a kiadott sávok viszont helyi időben vannak megadva
 * ("09:00"). Ha a Google-események óráját `getHours()`-szal olvasnánk, egy
 * 14:30-as vendég 12:30-nak látszana, és a délutánt tévesen foglaltnak vennénk.
 */
export const parts = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find(x => x.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

/** A @db.Date mezők UTC éjfélt tárolnak — ott az UTC olvasat a helyes. */
const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** Időbélyegből a szalon szerinti nap. */
const localKey = (d: Date) => parts(d).date;

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
  /** Mire kérik az időpontot. Enélkül csak a szűretlen sávok jönnek szóba. */
  serviceId?:  string;
  categoryId?: string;
}): Promise<FreeDay[]> {
  // A `date` oszlop naptári nap (DATE), ezért a határokat is UTC-éjfélre tesszük.
  // Helyi idejű határral az adatbázis a naphoz kerekít, és a tartomány utolsó
  // napja csendben kiesik — pont az, amelyikre a vendég foglalni akar.
  // A keresés kezdőnapja a szalon ideje szerint — UTC-ben futó szerveren a
  // késő esti időpont különben az előző napra esne.
  const [y, m, d] = parts(opts.from).date.split("-").map(Number);
  const first = new Date(Date.UTC(y!, m! - 1, d!));
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
      select: {
        date: true, startTime: true, endTime: true,
        categoryIds: true, serviceIds: true,
      },
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

  /**
   * Ráfér-e a kért szolgáltatás erre a sávra.
   *
   * Üres szűrés = bármire kiadtuk. Különben elég, ha vagy a tétel, vagy a
   * kategóriája szerepel: a szalon a délelőttöt kiadhatja "Férfi hajvágás"
   * egészben, és mellé jelölhet két külön festést is.
   */
  const fits = (w: { categoryIds: string[]; serviceIds: string[] }) => {
    if (!w.categoryIds.length && !w.serviceIds.length) return true;
    if (opts.serviceId  && w.serviceIds.includes(opts.serviceId))   return true;
    if (opts.categoryId && w.categoryIds.includes(opts.categoryId)) return true;
    return false;
  };

  const byDay = new Map<string, Window[]>();
  for (const w of windows) {
    const key = dayKey(new Date(w.date));
    if (closed.has(key)) continue;
    if (!fits(w)) continue;
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
      .map(b => {
        const from = parts(b.start).minutes;
        // Ha átnyúlik éjfélen, a nap végéig foglaljuk.
        const raw  = parts(b.end);
        const to   = raw.date === key ? raw.minutes : 24 * 60;
        return { startMin: from, endMin: Math.max(to, from + 1) };
      });
  };

  const earliest = new Date(Date.now() + LEAD_HOURS * 3600_000);
  const out: FreeDay[] = [];

  for (const [key, wins] of [...byDay.entries()].sort()) {
    const slots = daySlots(wins, busyOf(key), {
      minutes: opts.minutes, step: 15, buffer: BUFFER_MIN,
    });

    // A legkorábbi foglalható időpont: a szalon ideje szerint számolva.
    const usable = slots.filter(min => parts(earliest).date < key
      || (parts(earliest).date === key && min >= parts(earliest).minutes));

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
/** A vendég saját foglalása a tokenje alapján. */
export async function bookingByToken(token: string) {
  const b = await db.booking.findUnique({
    where:  { token },
    select: {
      id: true, name: true, service: true, startsAt: true, status: true, groupId: true,
      worker: { select: { name: true } },
    },
  });
  if (!b) return null;

  // Párban kért látogatás: a vendég a kettőt egy alkalomnak érzi, ezért mindkettőt
  // látnia kell — és tudnia kell, hogy a lemondás az egészre szól.
  const pair = b.groupId
    ? await db.booking.findFirst({
        where:  { groupId: b.groupId, id: { not: b.id } },
        select: { service: true, startsAt: true, status: true, worker: { select: { name: true } } },
      })
    : null;

  return { ...b, pair };
}

/**
 * A vendég lemondja az időpontját.
 *
 * Csak a saját, kitalálhatatlan tokenjével — jelszó nélkül, mert egy lemondást
 * senkinek nem éri meg meghamisítani, és a regisztráció-kényszer csak elriasztaná.
 * A már megkezdett vagy elmúlt időpontot nem lehet visszamondani.
 */
export async function cancelBooking(token: string): Promise<
  | { ok: true; booking: { name: string; service: string; startsAt: Date; workerName: string }; alsoCancelled: number }
  | { ok: false; reason: "nincs" | "lejart" | "mar-lemondva" }
> {
  const b = await db.booking.findUnique({
    where:  { token },
    include: { worker: { select: { name: true } } },
  });
  if (!b) return { ok: false, reason: "nincs" };
  if (b.status === "lemondva" || b.status === "elutasitva")
    return { ok: false, reason: "mar-lemondva" };
  if (b.startsAt < new Date()) return { ok: false, reason: "lejart" };

  // Párban kért látogatásnál a vendég egyetlen alkalmat mondott le a fejében —
  // ha csak az egyik felét vennénk le, a másik kolléga hiába várná.
  const group = b.groupId
    ? await db.booking.findMany({
        where: { groupId: b.groupId, status: { notIn: ["lemondva", "elutasitva"] } },
      })
    : [b];

  for (const row of group) {
    await db.booking.update({ where: { id: row.id }, data: { status: "lemondva" } });

    // Ha már elfogadtuk, az előjegyzés is essen ki a naptárból — különben a
    // szalon egy olyan vendégre várna, aki szólt, hogy nem jön.
    if (row.status === "elfogadva") {
      const appt = await db.appointment.findFirst({
        where: { workerId: row.workerId, start: row.startsAt, status: "foglalt" },
        select: { id: true },
      });
      if (appt) await db.appointment.update({ where: { id: appt.id }, data: { status: "lemondott" } });
    }
  }

  return {
    ok: true,
    alsoCancelled: Math.max(group.length - 1, 0),
    booking: { name: b.name, service: b.service, startsAt: b.startsAt, workerName: b.worker.name ?? "" },
  };
}

export async function confirmBooking(token: string): Promise<
  | { ok: true; alreadyDone: boolean; booking: { name: string; service: string; startsAt: Date; workerName: string } }
  | { ok: false; reason: "nincs" | "lejart" | "lemondva" }
> {
  const booking = await db.booking.findUnique({
    where:  { token },
    select: {
      id: true, name: true, email: true, service: true, minutes: true, groupId: true,
      startsAt: true, status: true, worker: { select: { name: true, notifyEmail: true } },
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

  // Párban kért látogatásnál egy kattintás erősíti meg mindkét felét: a vendég
  // egy alkalmat kért, két levélnyi hitelesítés csak elriasztaná.
  const group = booking.groupId
    ? await db.booking.findMany({
        where:  { groupId: booking.groupId, status: "megerosites_varo" },
        select: { id: true, service: true, startsAt: true, worker: { select: { name: true, notifyEmail: true } } },
        orderBy: { startsAt: "asc" },
      })
    : [];

  await db.booking.updateMany({
    where: booking.groupId
      ? { groupId: booking.groupId, status: "megerosites_varo" }
      : { id: booking.id },
    data: { status: "kert", confirmedAt: new Date() },
  });

  if (isConfigured()) {
    const other = group.find(g => g.id !== booking.id);
    const mail = {
      guestName: booking.name, service: booking.service,
      workerName: info.workerName, start: booking.startsAt,
      ...(other ? {
        also: { service: other.service, workerName: other.worker.name ?? "", start: other.startsAt },
      } : {}),
    };
    const guestMail = requestReceived(mail);
    const salon     = salonAddress();
    const salonMail = salonNotice(mail, `${appUrl()}/dashboard/calendar`);

    // Mindenki a sajátját bírálja el, ezért a dolgozó is kap értesítést a saját
    // címére. A belépési címére nem lehet küldeni: az kitalált (@salon-spellbook.local).
    // A szalon címe kettőzésre kerülne, ha a dolgozóé ugyanaz — ezért halmaz.
    // Mindkét kolléga a sajátját bírálja el, ezért a pár másik fele is kap
    // értesítést a saját címére.
    const workers = [booking.worker.notifyEmail, ...group.map(g => g.worker.notifyEmail)]
      .map(x => x?.trim() || null);
    const to = Array.from(new Set([salon, ...workers].filter((x): x is string => !!x)));

    // A levél elakadása ne vegye el a megerősítést: a kérés már bent van.
    await Promise.allSettled([
      send({ to: { email: booking.email, name: booking.name }, subject: guestMail.subject, html: guestMail.html }),
      ...to.map(email => send({ to: { email }, subject: salonMail.subject, html: salonMail.html })),
    ]);
  }

  return { ok: true, alreadyDone: false, booking: info };
}

/**
 * Szabad kezdések két kollégára, egy látogatásban.
 *
 * Akkor ajánlunk fel egy kezdést, ha az első szolgáltatás belefér, ÉS utána a
 * második is — legalább `PAIR_GAP_MIN` szünettel, de legfeljebb
 * `PAIR_MAX_WAIT_MIN` várakozással. A vendég egyetlen időpontot lát; hogy ez a
 * háttérben két kérés, az a szalon dolga.
 */
export async function freeDaysPair(opts: {
  first:  { workerId: string; minutes: number; serviceId: string; categoryId: string };
  second: { workerId: string; minutes: number; serviceId: string; categoryId: string };
  from:   Date;
  days:   number;
}): Promise<FreeDay[]> {
  const [a, b] = await Promise.all([
    freeDays({ ...opts.first,  from: opts.from, days: opts.days }),
    freeDays({ ...opts.second, from: opts.from, days: opts.days }),
  ]);

  const secondByDay = new Map(b.map(d => [d.date, d.slots.map(toMinutes)]));
  const out: FreeDay[] = [];

  for (const day of a) {
    const later = secondByDay.get(day.date);
    if (!later?.length) continue;

    const slots = day.slots.filter(hhmm => {
      const ends     = toMinutes(hhmm) + opts.first.minutes;
      const earliest = ends + PAIR_GAP_MIN;
      const latest   = ends + PAIR_MAX_WAIT_MIN;
      return later.some(m => m >= earliest && m <= latest);
    });

    if (slots.length) out.push({ date: day.date, slots });
  }
  return out;
}

/**
 * A második szolgáltatás kezdése egy elfogadott első időponthoz.
 *
 * A vendég csak az első kezdést választja ki; a másodikat mi tesszük a
 * legkorábbi olyan szabad helyre, ami a szünet után jön. Így nem kell két
 * időpontot egyeztetnie, és nem is csúszhat szét a kettő.
 */
export async function pairSecondStart(opts: {
  second: { workerId: string; minutes: number; serviceId: string; categoryId: string };
  firstEnd: Date;
}): Promise<Date | null> {
  const days = await freeDays({ ...opts.second, from: opts.firstEnd, days: 1 });
  const key  = parts(opts.firstEnd).date;
  const ends = parts(opts.firstEnd).minutes;

  const slots = days.find(d => d.date === key)?.slots.map(toMinutes) ?? [];
  const fit   = slots
    .filter(m => m >= ends + PAIR_GAP_MIN && m <= ends + PAIR_MAX_WAIT_MIN)
    .sort((x, y) => x - y)[0];

  if (fit === undefined) return null;
  return fromSalonLocal(`${key}T${String(Math.floor(fit / 60)).padStart(2, "0")}:${String(fit % 60).padStart(2, "0")}`);
}
