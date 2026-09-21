import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Online foglalható idősávok.
 *
 * A munkaidő azt mondja meg, mikor van bent a dolgozó; ez azt, mennyit adunk ki
 * ebből a nyilvános foglalónak. A kettő szándékosan külön: a maradék marad
 * beugró vendégnek és konzultációnak.
 */

const HHMM = z.string().regex(/^\d{1,2}:\d{2}$/, "Az időt ÓÓ:PP alakban kell megadni.");

/** Staff csak a saját sávjait kezelheti. */
function targetWorker(ctx: { session: { user: { id: string; role: string } } }, wanted?: string) {
  return ctx.session.user.role === "admin" && wanted ? wanted : ctx.session.user.id;
}

export const bookableRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.bookableWindow.findMany({
        where:   { date: { gte: new Date(input.from), lte: new Date(input.to) } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: { worker: { select: { id: true, name: true } } },
      })
    ),

  /** Egy sáv kiadása foglalásra. Az átfedő meglévő sávokat összevonjuk. */
  add: protectedProcedure
    .input(z.object({
      date:      z.string(),   // "YYYY-MM-DD"
      workerId:  z.string().optional(),
      startTime: HHMM,
      endTime:   HHMM,
    }))
    .mutation(async ({ ctx, input }) => {
      const workerId = targetWorker(ctx, input.workerId);
      const date     = new Date(input.date);

      const mins = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };
      if (mins(input.endTime) <= mins(input.startTime))
        throw new TRPCError({ code: "BAD_REQUEST", message: "A sáv vége nem lehet a kezdete előtt." });

      // Ami érintkezik vagy átfed, azt egy sávvá olvasztjuk — így nem keletkezik
      // tucatnyi apró, egymás melletti sáv ugyanarra a délelőttre.
      const existing = await ctx.db.bookableWindow.findMany({ where: { workerId, date } });
      const touching = existing.filter(w =>
        mins(w.startTime) <= mins(input.endTime) && mins(w.endTime) >= mins(input.startTime),
      );

      const startMin = Math.min(mins(input.startTime), ...touching.map(w => mins(w.startTime)));
      const endMin   = Math.max(mins(input.endTime),   ...touching.map(w => mins(w.endTime)));
      const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

      if (touching.length)
        await ctx.db.bookableWindow.deleteMany({ where: { id: { in: touching.map(w => w.id) } } });

      return ctx.db.bookableWindow.create({
        data: { date, workerId, startTime: fmt(startMin), endTime: fmt(endMin) },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const w = await ctx.db.bookableWindow.findUnique({ where: { id: input.id } });
      if (!w) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.session.user.role !== "admin" && w.workerId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Csak a saját sávodat veheted le." });
      await ctx.db.bookableWindow.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** Ugyanaz a sáv több napra — a havi nyitáshoz. */
  addBulk: protectedProcedure
    .input(z.object({
      dates:     z.array(z.string()).min(1).max(120),
      workerId:  z.string().optional(),
      startTime: HHMM,
      endTime:   HHMM,
    }))
    .mutation(async ({ ctx, input }) => {
      const workerId = targetWorker(ctx, input.workerId);
      for (const ds of input.dates) {
        const date = new Date(ds);
        await ctx.db.bookableWindow.deleteMany({ where: { workerId, date } });
        await ctx.db.bookableWindow.create({
          data: { date, workerId, startTime: input.startTime, endTime: input.endTime },
        });
      }
      return { count: input.dates.length };
    }),

  /** A kijelölt napokról leveszi a kiadott sávokat. */
  clearDays: protectedProcedure
    .input(z.object({ dates: z.array(z.string()).min(1).max(120), workerId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const workerId = targetWorker(ctx, input.workerId);
      const { count } = await ctx.db.bookableWindow.deleteMany({
        where: { workerId, date: { in: input.dates.map(d => new Date(d)) } },
      });
      return { count };
    }),
});
