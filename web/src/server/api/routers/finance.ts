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
          createdBy: { select: { name: true } },
          workDay:   { include: { user: { select: { name: true } } } },
          guestCard: {
            include: {
              guest:     { select: { name: true } },
              services:  { select: { name: true, price: true, duration: true, gender: true } },
              materials: { select: { name: true, brand: true, colorCode: true, grams: true } },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      type:        z.enum(["revenue", "material", "wage"]),
      description: z.string().min(1),
      amount:      z.number().positive(),
      date:        z.string(),
      guestCardId: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.financeEntry.create({
        data: {
          type:        input.type,
          description: input.description,
          amount:      input.amount,
          date:        new Date(input.date),
          createdById: ctx.session.user.id,
          ...(input.guestCardId && { guestCardId: input.guestCardId }),
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
