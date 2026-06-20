import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { entryWageAmount } from "~/lib/wage";

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
              { workDay: { userId: targetId } },
              { workDayId: null, createdById: targetId },
            ],
          }),
        },
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          workDay: {
            include: {
              user: { select: { id: true, name: true } },
              services: {
                include: { service: { select: { name: true, category: { select: { name: true } } } } },
              },
            },
          },
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
      visitGroupId: z.string().optional(),
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
          ...(input.visitGroupId && { visitGroupId: input.visitGroupId }),
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
          ...(targetId && { OR: [{ workDay: { userId: targetId } }, { workDayId: null, createdById: targetId }] }),
        },
        include: {
          guestCard: { include: { services: true } },
          workDay: {
            include: {
              services: {
                include: { service: { select: { name: true, category: { select: { name: true } } } } },
              },
            },
          },
        },
      });
      const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, material: 0, wage: 0, wageEstimate: 0 }));
      rows.forEach(e => {
        const m = new Date(e.date).getMonth();
        if (e.type === "revenue")  months[m]!.revenue  += e.amount;
        if (e.type === "material") months[m]!.material += e.amount;
        if (e.type === "wage")     months[m]!.wage     += e.amount;
        months[m]!.wageEstimate += entryWageAmount(e);
      });
      return months;
    }),

  perUserYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin") return [];
      const from = new Date(input.year, 0, 1);
      const to   = new Date(input.year + 1, 0, 1);
      const rows = await ctx.db.financeEntry.findMany({
        where: { date: { gte: from, lt: to } },
        include: {
          createdBy: { select: { id: true, name: true } },
          guestCard: { include: { services: true } },
          workDay: {
            include: {
              user: { select: { id: true, name: true } },
              services: {
                include: { service: { select: { name: true, category: { select: { name: true } } } } },
              },
            },
          },
        },
      });
      const byUser: Record<string, { id: string; name: string; revenue: number; material: number; wage: number; wageEstimate: number }> = {};
      rows.forEach(e => {
        const id   = e.workDay?.user?.id   ?? e.createdById ?? "?";
        const name = e.workDay?.user?.name ?? e.createdBy?.name ?? "?";
        if (!byUser[id]) byUser[id] = { id, name, revenue: 0, material: 0, wage: 0, wageEstimate: 0 };
        if (e.type === "revenue")  byUser[id]!.revenue  += e.amount;
        if (e.type === "material") byUser[id]!.material += e.amount;
        if (e.type === "wage")     byUser[id]!.wage     += e.amount;
        byUser[id]!.wageEstimate += entryWageAmount(e);
      });
      return Object.values(byUser).sort((a, b) => b.revenue - a.revenue);
    }),

  stats: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "admin";
      const from = new Date(input.year, 0, 1);
      const to   = new Date(input.year + 1, 0, 1);
      const rows = await ctx.db.financeEntry.findMany({
        where: {
          date: { gte: from, lt: to },
          ...(!isAdmin && { OR: [{ workDay: { userId: ctx.session.user.id } }, { workDayId: null, createdById: ctx.session.user.id }] }),
        },
        include: {
          guestCard: { include: { services: { select: { name: true, price: true, categoryName: true } } } },
          workDay: {
            include: {
              user: { select: { id: true, name: true } },
              services: { include: { service: { select: { name: true, price: true, category: { select: { name: true } } } } } },
            },
          },
        },
      });

      const DOW_LABELS = ["Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat","Vasárnap"];
      const byDow = DOW_LABELS.map((label, dow) => ({ dow, label, revenue: 0, count: 0 }));
      const byCategory: Record<string, { revenue: number; count: number }> = {};
      const egyebEntries: { description: string; amount: number; date: string; reason: string }[] = [];

      rows.forEach(e => {
        if (e.type !== "revenue") return;
        const dow = (new Date(e.date).getDay() + 6) % 7;
        byDow[dow]!.revenue += e.amount;
        byDow[dow]!.count += 1;

        // Service categories from guestCard or workDay
        const guestCats = e.guestCard?.services.map(s => s.categoryName ?? "Egyéb");
        const workCats  = e.workDay?.services.map(s => s.service.category?.name ?? "Egyéb");
        const cats: string[] = guestCats ?? workCats ?? [];

        if (cats.length === 0) {
          cats.push("Egyéb");
          const reason = !e.guestCard && !e.workDay
            ? "nincs vendégkártya / munkanap"
            : e.guestCard && e.guestCard.services.length === 0
            ? "vendégkártyán nincsenek szolgáltatások"
            : e.workDay && e.workDay.services.length === 0
            ? "munkanaphoz nincs szolgáltatás rögzítve"
            : "ismeretlen";
          egyebEntries.push({ description: e.description, amount: e.amount, date: e.date.toISOString().slice(0, 10), reason });
        }

        const share = e.amount / cats.length;
        cats.forEach(cat => {
          if (!byCategory[cat]) byCategory[cat] = { revenue: 0, count: 0 };
          byCategory[cat]!.revenue += share;
          byCategory[cat]!.count  += 1;
        });
      });

      return {
        byDow,
        byCategory: Object.entries(byCategory)
          .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), count: v.count }))
          .sort((a, b) => b.revenue - a.revenue),
        egyebEntries,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "admin";
      const entry = await ctx.db.financeEntry.findUnique({ where: { id: input.id }, select: { workDayId: true } });
      if (!entry) return;
      if (entry.workDayId) {
        if (!isAdmin) throw new Error("Naptárból hozzáadott tétel — a naptárban töröld.");
        return ctx.db.workDay.delete({ where: { id: entry.workDayId } });
      }
      return ctx.db.financeEntry.delete({ where: { id: input.id } });
    }),
});
