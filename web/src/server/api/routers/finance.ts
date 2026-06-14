import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const financeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number(), filterUserId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const from    = new Date(input.year, input.month - 1, 1);
      const to      = new Date(input.year, input.month, 1);
      const isAdmin = ctx.session.user.role === "admin";
      // Admin can filter by a specific user; non-admin always sees only their own
      const targetId = isAdmin ? input.filterUserId : ctx.session.user.id;

      return ctx.db.financeEntry.findMany({
        where: {
          date: { gte: from, lt: to },
          ...(targetId && {
            OR: [
              { createdById: targetId },
              { workDay: { userId: targetId } },
            ],
          }),
        },
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          workDay:   { include: { user: { select: { name: true } } } },
          guestCard: {
            include: {
              guest:     { select: { name: true } },
              services:  { select: { name: true, price: true, duration: true, gender: true, categoryName: true } },
              materials: { select: { name: true, brand: true, colorCode: true, grams: true, lineTotal: true } },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      type:         z.enum(["revenue", "material", "wage"]),
      description:  z.string().min(1),
      amount:       z.number().positive(),
      date:         z.string(),
      guestCardId:  z.string().optional(),
      workerUserId: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const isAdmin    = ctx.session.user.role === "admin";
      const createdById = (isAdmin && input.workerUserId) ? input.workerUserId : ctx.session.user.id;
      return ctx.db.financeEntry.create({
        data: {
          type:        input.type,
          description: input.description,
          amount:      input.amount,
          date:        new Date(input.date),
          createdById,
          ...(input.guestCardId && { guestCardId: input.guestCardId }),
        },
      });
    }),

  updateDate: protectedProcedure
    .input(z.object({
      entryIds:   z.array(z.string()),
      date:       z.string(),
      guestCardId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = new Date(input.date);
      await ctx.db.financeEntry.updateMany({ where: { id: { in: input.entryIds } }, data: { date: d } });
      if (input.guestCardId) await ctx.db.guestCard.update({ where: { id: input.guestCardId }, data: { date: d } });
    }),

  yearSummary: protectedProcedure
    .input(z.object({ year: z.number(), filterUserId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const from    = new Date(input.year, 0, 1);
      const to      = new Date(input.year + 1, 0, 1);
      const isAdmin = ctx.session.user.role === "admin";
      const targetId = isAdmin ? input.filterUserId : ctx.session.user.id;
      const rows = await ctx.db.financeEntry.findMany({
        where: {
          date: { gte: from, lt: to },
          ...(targetId && { OR: [{ createdById: targetId }, { workDay: { userId: targetId } }] }),
        },
        select: { type: true, amount: true, date: true },
      });
      const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, material: 0, wage: 0 }));
      rows.forEach(e => {
        const m = new Date(e.date).getMonth();
        if (e.type === "revenue")  months[m]!.revenue  += e.amount;
        if (e.type === "material") months[m]!.material += e.amount;
        if (e.type === "wage")     months[m]!.wage     += e.amount;
      });
      return months;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.financeEntry.findUnique({ where: { id: input.id } });
      if (entry?.workDayId) throw new Error("Naptárból hozzáadott tétel — a naptárban töröld.");
      return ctx.db.financeEntry.delete({ where: { id: input.id } });
    }),
});
