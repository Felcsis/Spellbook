import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Nem foglalható napok: szabadság, zárva tartás, betegség.
 *
 * Ha nincs megadva dolgozó, az egész szalonra vonatkozik (pl. ünnepnap).
 * A szabad idő számítása ezeket kihagyja.
 */
export const timeOffRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.timeOff.findMany({
        where:   { date: { gte: new Date(input.from), lte: new Date(input.to) } },
        orderBy: { date: "asc" },
        include: { worker: { select: { id: true, name: true } } },
      })
    ),

  /** Napok megjelölése nem foglalhatóként. */
  set: protectedProcedure
    .input(z.object({
      dates:    z.array(z.string()).min(1).max(120),
      workerId: z.string().nullable(),
      reason:   z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Az egész szalonra szólót csak admin adhat meg; staff csak magának.
      const workerId = ctx.session.user.role === "admin"
        ? input.workerId
        : ctx.session.user.id;

      for (const ds of input.dates) {
        const date = new Date(ds);
        const existing = await ctx.db.timeOff.findFirst({ where: { date, workerId } });
        if (existing) {
          await ctx.db.timeOff.update({ where: { id: existing.id }, data: { reason: input.reason ?? null } });
        } else {
          await ctx.db.timeOff.create({ data: { date, workerId, reason: input.reason ?? null } });
        }
      }
      return { count: input.dates.length };
    }),

  /** A megjelölés visszavonása. */
  remove: protectedProcedure
    .input(z.object({ dates: z.array(z.string()).min(1).max(120), workerId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const workerId = ctx.session.user.role === "admin"
        ? input.workerId
        : ctx.session.user.id;

      const { count } = await ctx.db.timeOff.deleteMany({
        where: { workerId, date: { in: input.dates.map(d => new Date(d)) } },
      });
      return { count };
    }),

  deleteOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await ctx.db.timeOff.findUnique({ where: { id: input.id } });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.session.user.role !== "admin" && t.workerId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await ctx.db.timeOff.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
