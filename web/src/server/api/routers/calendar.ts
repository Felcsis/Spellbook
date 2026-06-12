import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calendarRouter = createTRPCRouter({
  // All users (for the legend + add form)
  users: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ),

  // Work days for a given month
  month: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month, 1);
      return ctx.db.workDay.findMany({
        where: { date: { gte: from, lt: to } },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: "asc" },
      });
    }),

  // Upsert a work day entry
  upsert: protectedProcedure
    .input(z.object({
      date:     z.string(), // "YYYY-MM-DD"
      userId:   z.string(),
      earnings: z.number().min(0),
      notes:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = new Date(input.date);
      return ctx.db.workDay.upsert({
        where:  { date_userId: { date, userId: input.userId } },
        create: { date, userId: input.userId, earnings: input.earnings, notes: input.notes },
        update: { earnings: input.earnings, notes: input.notes },
      });
    }),

  // Delete a work day entry
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.workDay.delete({ where: { id: input.id } })
    ),
});
