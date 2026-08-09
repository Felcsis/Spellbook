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
        orderBy: { createdAt: "desc" },
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

  updateEntry: protectedProcedure
    .input(z.object({
      id:          z.string(),
      amount:      z.number().positive().optional(),
      description: z.string().optional(),
      date:        z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.financeEntry.update({
        where: { id: input.id },
        data: {
          ...(input.amount      !== undefined && { amount: input.amount }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.date        !== undefined && { date: new Date(input.date) }),
        },
      })
    ),

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

  // Rugalmas időszakos kimutatás: nap / hét / hónap / negyedév / félév / év.
  // Naptárhoz igazított időszak az `anchor` dátum körül, személyenkénti + összesített
  // bontással és idősoros bucketekkel (személyenként) egy stacked charthoz.
  periodStats: protectedProcedure
    .input(z.object({
      granularity: z.enum(["day", "week", "month", "quarter", "half", "year"]),
      anchor: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "admin";
      const anchor = new Date(input.anchor);
      const y = anchor.getFullYear(), m = anchor.getMonth(), d = anchor.getDate();
      const MON = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Sze", "Okt", "Nov", "Dec"];

      let from: Date, to: Date, label: string;
      let bucketUnit: "day" | "month";

      switch (input.granularity) {
        case "day":
          from = new Date(y, m, d); to = new Date(y, m, d + 1); bucketUnit = "day";
          label = from.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
          break;
        case "week": {
          const dow = (anchor.getDay() + 6) % 7; // hétfő = 0
          from = new Date(y, m, d - dow);
          to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
          bucketUnit = "day";
          const last = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1);
          label = `${from.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
          break;
        }
        case "month":
          from = new Date(y, m, 1); to = new Date(y, m + 1, 1); bucketUnit = "day";
          label = from.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
          break;
        case "quarter": {
          const q = Math.floor(m / 3);
          from = new Date(y, q * 3, 1); to = new Date(y, q * 3 + 3, 1); bucketUnit = "month";
          label = `${y}. ${q + 1}. negyedév`;
          break;
        }
        case "half": {
          const h = m < 6 ? 0 : 1;
          from = new Date(y, h * 6, 1); to = new Date(y, h * 6 + 6, 1); bucketUnit = "month";
          label = `${y}. ${h === 0 ? "I." : "II."} félév`;
          break;
        }
        default:
          from = new Date(y, 0, 1); to = new Date(y + 1, 0, 1); bucketUnit = "month";
          label = `${y}. év`;
      }

      const targetId = isAdmin ? undefined : ctx.session.user.id;
      const rows = await ctx.db.financeEntry.findMany({
        where: {
          date: { gte: from, lt: to },
          ...(targetId && { OR: [{ workDay: { userId: targetId } }, { workDayId: null, createdById: targetId }] }),
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          guestCard: { include: { services: { select: { name: true, price: true, gender: true, categoryName: true } } } },
          workDay: {
            include: {
              user: { select: { id: true, name: true } },
              services: { include: { service: { select: { name: true, price: true, category: { select: { name: true } } } } } },
            },
          },
        },
      });

      // Üres bucketek előre, hogy a hézagok is 0-ként jelenjenek meg.
      type Bucket = { key: string; label: string; total: number } & Record<string, number | string>;
      const buckets: Bucket[] = [];
      const bidx: Record<string, number> = {};
      const keyDay = (t: Date) => `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
      const keyMonth = (t: Date) => `${t.getFullYear()}-${t.getMonth()}`;

      if (bucketUnit === "day") {
        for (let t = new Date(from); t < to; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) {
          const blabel = input.granularity === "week"
            ? ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Va"][(t.getDay() + 6) % 7]!
            : String(t.getDate());
          bidx[keyDay(t)] = buckets.length;
          buckets.push({ key: keyDay(t), label: blabel, total: 0 });
        }
      } else {
        for (let t = new Date(from); t < to; t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) {
          bidx[keyMonth(t)] = buckets.length;
          buckets.push({ key: keyMonth(t), label: MON[t.getMonth()]!, total: 0 });
        }
      }

      const byUser: Record<string, { id: string; name: string; revenue: number; material: number; wage: number; wageEstimate: number; count: number }> = {};
      const combined = { revenue: 0, material: 0, wage: 0, wageEstimate: 0, count: 0 };

      rows.forEach(e => {
        const id = e.workDay?.user?.id ?? e.createdById ?? "?";
        const name = e.workDay?.user?.name ?? e.createdBy?.name ?? "?";
        byUser[id] ??= { id, name, revenue: 0, material: 0, wage: 0, wageEstimate: 0, count: 0 };
        const est = entryWageAmount(e);
        if (e.type === "revenue") { byUser[id]!.revenue += e.amount; byUser[id]!.count += 1; combined.revenue += e.amount; combined.count += 1; }
        if (e.type === "material") { byUser[id]!.material += e.amount; combined.material += e.amount; }
        if (e.type === "wage") { byUser[id]!.wage += e.amount; combined.wage += e.amount; }
        byUser[id]!.wageEstimate += est; combined.wageEstimate += est;

        if (e.type === "revenue") {
          const bk = bucketUnit === "day" ? keyDay(new Date(e.date)) : keyMonth(new Date(e.date));
          const b = buckets[bidx[bk] ?? -1];
          if (b) { b.total += e.amount; b[id] = (Number(b[id]) || 0) + e.amount; }
        }
      });

      const perUser = Object.values(byUser).sort((a, b) => b.revenue - a.revenue);
      return {
        granularity: input.granularity,
        range: { from: from.toISOString(), to: to.toISOString(), label },
        users: perUser.map(u => ({ id: u.id, name: u.name })),
        buckets,
        perUser,
        combined,
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
