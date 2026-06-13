import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calendarRouter = createTRPCRouter({
  // Admin látja az összes usert, staff csak magát
  users: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role === "admin") {
      return ctx.db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    }
    return ctx.db.user.findMany({
      where:   { id: ctx.session.user.id },
      select:  { id: true, name: true },
    });
  }),

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

  month: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const from    = new Date(input.year, input.month - 1, 1);
      const to      = new Date(input.year, input.month, 1);
      const isAdmin = ctx.session.user.role === "admin";

      const [workDays, financeEntries] = await Promise.all([
        ctx.db.workDay.findMany({
          where: {
            date: { gte: from, lt: to },
            ...(!isAdmin && { userId: ctx.session.user.id }),
          },
          include: {
            user:     { select: { id: true, name: true } },
            services: { include: { service: { select: { id: true, name: true, price: true } } } },
          },
          orderBy: { date: "asc" },
        }),
        ctx.db.financeEntry.findMany({
          where: {
            date:      { gte: from, lt: to },
            workDayId: null,
            ...(!isAdmin && { createdById: ctx.session.user.id }),
          },
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { date: "asc" },
        }),
      ]);
      return { workDays, financeEntries };
    }),

  upsert: protectedProcedure
    .input(z.object({
      date:       z.string(),
      userId:     z.string(),
      earnings:   z.number().min(0),
      notes:      z.string().optional(),
      serviceIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Staff csak a saját adatát módosíthatja
      const targetUserId = ctx.session.user.role === "admin"
        ? input.userId
        : ctx.session.user.id;

      const date = new Date(input.date);
      const user = await ctx.db.user.findUnique({
        where: { id: targetUserId }, select: { name: true },
      });

      const workDay = await ctx.db.workDay.upsert({
        where:  { date_userId: { date, userId: targetUserId } },
        create: { date, userId: targetUserId, earnings: input.earnings, notes: input.notes },
        update: { earnings: input.earnings, notes: input.notes },
      });

      if (input.serviceIds !== undefined) {
        await ctx.db.workDayService.deleteMany({
          where: { workDayId: workDay.id, serviceId: { notIn: input.serviceIds } },
        });
        if (input.serviceIds.length > 0) {
          const services = await ctx.db.service.findMany({
            where:  { id: { in: input.serviceIds } },
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

      const wds = await ctx.db.workDayService.findMany({
        where:   { workDayId: workDay.id },
        include: { service: { select: { name: true } } },
      });
      const serviceNames = wds.map(w => w.service.name).join(", ");
      const description  = serviceNames
        ? `${user?.name ?? "Ismeretlen"} – ${serviceNames}`
        : `${user?.name ?? "Ismeretlen"} munkadíja`;

      await ctx.db.financeEntry.upsert({
        where:  { workDayId: workDay.id },
        create: { type: "revenue", description, amount: input.earnings, date, createdById: ctx.session.user.id, workDayId: workDay.id },
        update: { amount: input.earnings, description },
      });

      return workDay;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Staff csak a saját munkabejegyzését törölheti
      const workDay = await ctx.db.workDay.findUnique({ where: { id: input.id } });
      if (!workDay) throw new Error("Nem található.");
      if (ctx.session.user.role !== "admin" && workDay.userId !== ctx.session.user.id) {
        throw new Error("Nincs jogosultságod.");
      }
      return ctx.db.workDay.delete({ where: { id: input.id } });
    }),

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
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.financeEntry.findUnique({ where: { id: input.id } });
      if (!entry) throw new Error("Nem található.");
      if (ctx.session.user.role !== "admin" && entry.createdById !== ctx.session.user.id) {
        throw new Error("Nincs jogosultságod.");
      }
      return ctx.db.financeEntry.delete({ where: { id: input.id } });
    }),
});
