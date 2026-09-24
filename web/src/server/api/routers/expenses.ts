import { z } from "zod";
import { createTRPCRouter, salonProcedure } from "~/server/api/trpc";
import { dueDateIn, materializeRecurringExpenses, nextDueFromToday } from "~/server/recurring-expenses";

export const EXPENSE_CATEGORIES = [
  "Rezsi",
  "Eszköz / gép",
  "Termék / alapanyag",
  "Szoftver / előfizetés",
  "Bérleti díj",
  "Könyvelés / admin",
  "Adó / járulék",
  "Marketing",
  "Egyéb",
] as const;

/** "YYYY-MM-DD" → az első esedékesség: ha a nap már elmúlt a hónapban, akkor is ez. */
function firstDue(start: string, dayOfMonth: number): Date {
  const [y, m] = start.split("-").map(Number) as [number, number];
  return dueDateIn(y, m - 1, dayOfMonth);
}

export const expensesRouter = createTRPCRouter({
  list: salonProcedure
    .input(z.object({ year: z.number(), month: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await materializeRecurringExpenses();
      const from = input.month
        ? new Date(input.year, input.month - 1, 1)
        : new Date(input.year, 0, 1);
      const to = input.month
        ? new Date(input.year, input.month, 1)
        : new Date(input.year + 1, 0, 1);
      return ctx.db.expense.findMany({
        where: { date: { gte: from, lt: to } },
        orderBy: { date: "desc" },
        include: {
          createdBy:  { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });
    }),

  /** Csak a fizetett/függőben állapot — a listából egy kattintással. */
  setPaid: salonProcedure
    .input(z.object({ id: z.string(), paid: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.expense.update({ where: { id: input.id }, data: { paid: input.paid } })
    ),

  // ── Havonta ismétlődő kiadások ──────────────────────────────────────────

  recurringList: salonProcedure.query(({ ctx }) =>
    ctx.db.recurringExpense.findMany({
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
      include: { assignedTo: { select: { id: true, name: true } } },
    })
  ),

  recurringCreate: salonProcedure
    .input(z.object({
      title:        z.string().min(1),
      amount:       z.number().positive(),
      category:     z.string().default("Egyéb"),
      notes:        z.string().optional(),
      /** Az első esedékesség napja; ebből jön a hónap napja is. */
      startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      assignedToId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dayOfMonth = Number(input.startDate.slice(8, 10));
      const t = await ctx.db.recurringExpense.create({
        data: {
          title:        input.title,
          amount:       input.amount,
          category:     input.category,
          notes:        input.notes,
          dayOfMonth,
          nextDue:      firstDue(input.startDate, dayOfMonth),
          createdById:  ctx.session.user.id,
          assignedToId: input.assignedToId ?? null,
        },
      });
      // Ha az első esedékesség ma vagy korábban van, rögtön látszódjon.
      await materializeRecurringExpenses();
      return t;
    }),

  /**
   * A sablon módosítása csak a jövőbeli hónapokra hat — a már létrejött
   * kiadásokat egyenként lehet javítani.
   */
  recurringUpdate: salonProcedure
    .input(z.object({
      id:           z.string(),
      title:        z.string().min(1).optional(),
      amount:       z.number().positive().optional(),
      category:     z.string().optional(),
      notes:        z.string().nullable().optional(),
      dayOfMonth:   z.number().int().min(1).max(31).optional(),
      active:       z.boolean().optional(),
      assignedToId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cur = await ctx.db.recurringExpense.findUniqueOrThrow({ where: { id: input.id } });
      const day = input.dayOfMonth ?? cur.dayOfMonth;
      // Szünet után a folytatás mától számít: a kihagyott hónapokat nem pótolja.
      // Új nap: a következő esedékesség ugyanabban a hónapban marad, csak a nap változik.
      const nextDue =
        input.active === true && !cur.active
          ? nextDueFromToday(day)
          : day !== cur.dayOfMonth
            ? dueDateIn(cur.nextDue.getUTCFullYear(), cur.nextDue.getUTCMonth(), day)
            : undefined;
      return ctx.db.recurringExpense.update({
        where: { id: input.id },
        data: {
          ...(input.title    !== undefined && { title: input.title }),
          ...(input.amount   !== undefined && { amount: input.amount }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.notes    !== undefined && { notes: input.notes }),
          ...(input.active   !== undefined && { active: input.active }),
          ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
          ...(input.dayOfMonth   !== undefined && { dayOfMonth: input.dayOfMonth }),
          ...(nextDue && { nextDue }),
        },
      });
    }),

  /** A sablon törlése; a már létrejött kiadások megmaradnak. */
  recurringDelete: salonProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.recurringExpense.delete({ where: { id: input.id } })),

  create: salonProcedure
    .input(z.object({
      title:        z.string().min(1),
      amount:       z.number().positive(),
      date:         z.string(),
      category:     z.string().default("Egyéb"),
      notes:        z.string().optional(),
      paid:         z.boolean().default(true),
      assignedToId: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.expense.create({
        data: {
          title:        input.title,
          amount:       input.amount,
          date:         new Date(input.date),
          category:     input.category,
          notes:        input.notes,
          paid:         input.paid,
          createdById:  ctx.session.user.id,
          assignedToId: input.assignedToId ?? null,
        },
      })
    ),

  update: salonProcedure
    .input(z.object({
      id:           z.string(),
      title:        z.string().min(1).optional(),
      amount:       z.number().positive().optional(),
      date:         z.string().optional(),
      category:     z.string().optional(),
      notes:        z.string().optional(),
      paid:         z.boolean().optional(),
      assignedToId: z.string().nullable().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.expense.update({
        where: { id: input.id },
        data: {
          ...(input.title    && { title: input.title }),
          ...(input.amount   && { amount: input.amount }),
          ...(input.date     && { date: new Date(input.date) }),
          ...(input.category && { category: input.category }),
          ...(input.paid !== undefined && { paid: input.paid }),
          notes: input.notes ?? undefined,
          ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
        },
      })
    ),

  delete: salonProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.expense.delete({ where: { id: input.id } })),

  // Staff-accessible: only expenses assigned to the current user
  listMine: salonProcedure
    .input(z.object({ year: z.number(), month: z.number().optional() }))
    .query(({ ctx, input }) => {
      const from = input.month
        ? new Date(input.year, input.month - 1, 1)
        : new Date(input.year, 0, 1);
      const to = input.month
        ? new Date(input.year, input.month, 1)
        : new Date(input.year + 1, 0, 1);
      return ctx.db.expense.findMany({
        where: { assignedToId: ctx.session.user.id, date: { gte: from, lt: to } },
        orderBy: { date: "desc" },
        select: { id: true, title: true, amount: true, date: true, category: true, notes: true, paid: true, recurringId: true },
      });
    }),
});
