import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { deleteEvent, isConfigured as gcalConfigured, upsertEvent } from "~/server/google";
import type { PrismaClient } from "../../../../generated/prisma";
import { freeSlots, type Busy } from "~/server/free-slots";

/**
 * Előjegyzések: foglalás, áthelyezés, lemondás, és a szabad idő kiszámítása.
 *
 * Amit itt rögzítünk, az kimegy a dolgozó Google Naptárába is — így nem kell két
 * helyen vezetni. Az onnan visszaolvasott eseményt a `googleEventId` alapján
 * felismerjük, hogy ugyanaz az időpont ne jelenjen meg kétszer a naptárban.
 */

const AppointmentInput = z.object({
  workerId:  z.string(),
  guestId:   z.string().optional(),
  guestName: z.string().min(1, "A vendég neve kötelező."),
  phone:     z.string().optional(),
  start:     z.string(),           // ISO
  durationMinutes: z.number().min(5).max(600),
  services:  z.string().optional(),
  notes:     z.string().optional(),
});

/** Staff csak a saját nevére foglalhat; admin bárkinek. */
async function resolveWorker(ctx: Ctx, wanted: string | undefined): Promise<string> {
  if (ctx.session.user.role !== "admin") return ctx.session.user.id;
  if (!wanted) return ctx.session.user.id;
  const w = await ctx.db.user.findUnique({ where: { id: wanted }, select: { id: true } });
  return w?.id ?? ctx.session.user.id;
}

type Ctx = {
  db: PrismaClient;
  session: { user: { id: string; role: string } };
};

/**
 * Ütközés-vizsgálat: ugyanannak a dolgozónak ne lehessen két vendége egyszerre.
 * Nem tiltjuk meg — a valóságban előfordul átfedés —, de jelezzük a felületen.
 */
async function overlapping(db: PrismaClient, workerId: string, start: Date, end: Date, exceptId?: string) {
  return db.appointment.findMany({
    where: {
      workerId,
      status: "foglalt",
      id:     exceptId ? { not: exceptId } : undefined,
      start:  { lt: end },
      end:    { gt: start },
    },
    select: { id: true, guestName: true, start: true, end: true },
  });
}

/** A Google-eseménnyé alakított előjegyzés. */
function eventOf(a: { guestName: string; services: string | null; notes: string | null; phone: string | null }) {
  return {
    title: a.services ? `${a.guestName} — ${a.services}` : a.guestName,
    notes: [a.phone, a.notes].filter(Boolean).join("\n") || null,
  };
}

/** Kiküldés a Google Naptárba. Hiba esetén az előjegyzés akkor is megmarad. */
export async function pushToGoogle(db: PrismaClient, id: string): Promise<void> {
  if (!gcalConfigured()) return;
  try {
    const a = await db.appointment.findUnique({
      where:   { id },
      include: { worker: { select: { id: true, googleRefreshToken: true, googleCalendarId: true } } },
    });
    if (!a?.worker.googleRefreshToken) return;

    if (a.status === "lemondott") {
      if (a.googleEventId) {
        await deleteEvent(a.worker, a.googleEventId);
        await db.appointment.update({ where: { id }, data: { googleEventId: null } });
      }
      return;
    }

    const { title, notes } = eventOf(a);
    const eventId = await upsertEvent(a.worker, {
      eventId: a.googleEventId,
      title,
      start:   a.start,
      end:     a.end,
      notes,
    });
    if (eventId && eventId !== a.googleEventId)
      await db.appointment.update({ where: { id }, data: { googleEventId: eventId } });
  } catch {
    // A naptár-szinkron sosem akaszthatja meg a foglalást.
  }
}

export const appointmentsRouter = createTRPCRouter({
  /** Egy időszak előjegyzései. */
  list: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.appointment.findMany({
        where:   { start: { gte: new Date(input.from), lte: new Date(input.to) } },
        orderBy: { start: "asc" },
        include: { worker: { select: { id: true, name: true } } },
      })
    ),

  /**
   * Hova fér még be vendég. A nyitvatartást a rögzített munkanap adja; ahol nincs
   * munkaidő, ott nem ajánlunk időpontot (nem tudjuk, dolgozik-e aznap).
   */
  freeSlots: protectedProcedure
    .input(z.object({
      workerId:        z.string(),
      from:            z.string(),   // "YYYY-MM-DD"
      days:            z.number().min(1).max(21).default(7),
      durationMinutes: z.number().min(5).max(600).default(60),
    }))
    .query(async ({ ctx, input }) => {
      const first = new Date(`${input.from}T00:00:00`);
      const last  = new Date(first);
      last.setDate(last.getDate() + input.days);

      const [workDays, appointments, timeOff] = await Promise.all([
        ctx.db.workDay.findMany({
          where:  { userId: input.workerId, date: { gte: first, lt: last } },
          select: { date: true, startTime: true, endTime: true },
        }),
        ctx.db.appointment.findMany({
          where:  { workerId: input.workerId, status: "foglalt", start: { gte: first, lt: last } },
          select: { start: true, end: true },
        }),
        // Szabadság: a dolgozóé és az egész szalonra szóló (workerId null) is kizár.
        ctx.db.timeOff.findMany({
          where:  { date: { gte: first, lt: last }, OR: [{ workerId: input.workerId }, { workerId: null }] },
          select: { date: true },
        }),
      ]);

      const closed = new Set(timeOff.map(t => {
        const d = new Date(t.date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }));

      // A vendégkártya nem foglal időt: az már megtörtént munka.
      const busy: Busy[] = appointments;

      return workDays
        .filter(w => {
          const d  = new Date(w.date);
          const ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
          return !closed.has(ds);
        })
        .map(w => {
          // A munkanap dátuma UTC-ben tárolt naptári nap; helyi éjfélre igazítjuk.
          const day = new Date(w.date);
          const local = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          const slots = freeSlots(
            { day: local, start: w.startTime, end: w.endTime },
            busy,
            input.durationMinutes,
          );
          return {
            date:  `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`,
            slots: slots.map(s => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
          };
        })
        .filter(d => d.slots.length > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    }),

  create: protectedProcedure
    .input(AppointmentInput)
    .mutation(async ({ ctx, input }) => {
      const workerId = await resolveWorker(ctx, input.workerId);
      const start    = new Date(input.start);
      const end      = new Date(start.getTime() + input.durationMinutes * 60_000);

      const clash = await overlapping(ctx.db, workerId, start, end);

      const appointment = await ctx.db.appointment.create({
        data: {
          workerId, start, end,
          guestId:     input.guestId ?? null,
          guestName:   input.guestName.trim(),
          phone:       input.phone ?? null,
          services:    input.services ?? null,
          notes:       input.notes ?? null,
          createdById: ctx.session.user.id,
        },
      });
      await pushToGoogle(ctx.db, appointment.id);
      return { appointment, clash };
    }),

  /** Áthelyezés: új kezdet, és ha kell, új dolgozó vagy hossz. */
  move: protectedProcedure
    .input(z.object({
      id:              z.string(),
      start:           z.string(),
      durationMinutes: z.number().min(5).max(600).optional(),
      workerId:        z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.appointment.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen előjegyzés." });
      if (ctx.session.user.role !== "admin" && existing.workerId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Csak a saját időpontodat helyezheted át." });

      const minutes  = input.durationMinutes
        ?? Math.round((existing.end.getTime() - existing.start.getTime()) / 60_000);
      const start    = new Date(input.start);
      const end      = new Date(start.getTime() + minutes * 60_000);
      const workerId = input.workerId ? await resolveWorker(ctx, input.workerId) : existing.workerId;

      const clash = await overlapping(ctx.db, workerId, start, end, existing.id);

      const appointment = await ctx.db.appointment.update({
        where: { id: input.id },
        data:  { start, end, workerId },
      });
      await pushToGoogle(ctx.db, appointment.id);
      return { appointment, clash };
    }),

  /**
   * Lemondás. Nem töröljük a sort, csak jelöljük — így megmarad, hogy volt egy
   * időpont, ami lemondásra került; a Google-eseményt viszont kivesszük.
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.appointment.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen előjegyzés." });
      if (ctx.session.user.role !== "admin" && existing.workerId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Csak a saját időpontodat mondhatod le." });

      await ctx.db.appointment.update({ where: { id: input.id }, data: { status: "lemondott" } });
      await pushToGoogle(ctx.db, input.id);
      return { ok: true };
    }),

  /** Végleges törlés — adminnak, ha téves foglalás született. */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const a = await ctx.db.appointment.findUnique({
        where:   { id: input.id },
        include: { worker: { select: { id: true, googleRefreshToken: true, googleCalendarId: true } } },
      });
      if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen előjegyzés." });

      if (a.googleEventId && a.worker.googleRefreshToken) {
        try { await deleteEvent(a.worker, a.googleEventId); } catch { /* már nincs meg */ }
      }
      await ctx.db.appointment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
