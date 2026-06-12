import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const financeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month, 1);
      // All finance entries (incl. WorkDay-linked revenue)
      return ctx.db.financeEntry.findMany({
        where: { date: { gte: from, lt: to } },
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { name: true } },
          workDay:   { include: { user: { select: { name: true } } } },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      type:        z.enum(["revenue", "material", "wage"]),
      description: z.string().min(1),
      amount:      z.number().positive(),
      date:        z.string(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.financeEntry.create({
        data: {
          type:        input.type,
          description: input.description,
          amount:      input.amount,
          date:        new Date(input.date),
          createdById: ctx.session.user.id,
        },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.financeEntry.findUnique({ where: { id: input.id } });
      if (entry?.workDayId) throw new Error("Naptárból hozzáadott tétel — a naptárban töröld.");
      return ctx.db.financeEntry.delete({ where: { id: input.id } });
    }),
});
