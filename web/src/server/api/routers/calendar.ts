import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calendarRouter = createTRPCRouter({
  users: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ),

  // All active services grouped by category (for the service picker)
  services: protectedProcedure.query(({ ctx }) =>
    ctx.db.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        services: {
          where:   { active: true },
          orderBy: { order: "asc" },
          select:  { id: true, name: true, price: true, duration: true },
        },
      },
    })
  ),

  // Work days + finance entries for the month
  month: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month, 1);
      const [workDays, financeEntries] = await Promise.all([
        ctx.db.workDay.findMany({
          where:   { date: { gte: from, lt: to } },
          include: {
            user:     { select: { id: true, name: true } },
            services: { include: { service: { select: { id: true, name: true, price: true } } } },
          },
          orderBy: { date: "asc" },
        }),
        ctx.db.financeEntry.findMany({
          where:   { date: { gte: from, lt: to }, workDayId: null },
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { date: "asc" },
        }),
      ]);
      return { workDays, financeEntries };
    }),

  // Upsert work day with services → auto-sync FinanceEntry
  upsert: protectedProcedure
    .input(z.object({
      date:       z.string(),
      userId:     z.string(),
      earnings:   z.number().min(0),
      notes:      z.string().optional(),
      serviceIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = new Date(input.date);
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId }, select: { name: true },
      });

      // Upsert WorkDay
      const workDay = await ctx.db.workDay.upsert({
        where:  { date_userId: { date, userId: input.userId } },
        create: { date, userId: input.userId, earnings: input.earnings, notes: input.notes },
        update: { earnings: input.earnings, notes: input.notes },
      });

      // Sync WorkDayService records
      if (input.serviceIds !== undefined) {
        // Remove old entries not in new list
        await ctx.db.workDayService.deleteMany({
          where: { workDayId: workDay.id, serviceId: { notIn: input.serviceIds } },
        });
        // Upsert new ones with current price snapshot
        if (input.serviceIds.length > 0) {
          const services = await ctx.db.service.findMany({
            where: { id: { in: input.serviceIds } },
            select: { id: true, price: true },
          });
          await Promise.all(
            services.map(s =>
              ctx.db.workDayService.upsert({
                where:  { workDayId_serviceId: { workDayId: workDay.id, serviceId: s.id } },
                create: { workDayId: workDay.id, serviceId: s.id, priceSnap: s.price },
                update: { priceSnap: s.price },
              })
            )
          );
        }
      }

      // Build description: service names or fallback
      const wds = await ctx.db.workDayService.findMany({
        where: { workDayId: workDay.id },
        include: { service: { select: { name: true } } },
      });
      const serviceNames = wds.map(w => w.service.name).join(", ");
      const description  = serviceNames
        ? `${user?.name ?? "Ismeretlen"} – ${serviceNames}`
        : `${user?.name ?? "Ismeretlen"} munkadíja`;

      // Auto-sync FinanceEntry (revenue)
      await ctx.db.financeEntry.upsert({
        where:  { workDayId: workDay.id },
        create: { type: "revenue", description, amount: input.earnings, date, createdById: ctx.session.user.id, workDayId: workDay.id },
        update: { amount: input.earnings, description },
      });

      return workDay;
    }),

  // Delete work day (FinanceEntry auto-deleted via Cascade)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.workDay.delete({ where: { id: input.id } })),

  // Add cost entry (material / wage) from calendar
  addCost: protectedProcedure
    .input(z.object({
      date:        z.string(),
      type:        z.enum(["material", "wage"]),
      description: z.string().min(1),
      amount:      z.number().positive(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.financeEntry.create({
        data: { type: input.type, description: input.description, amount: input.amount, date: new Date(input.date), createdById: ctx.session.user.id },
      })
    ),

  deleteCost: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.financeEntry.delete({ where: { id: input.id } })),
});
