import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const EXPENSE_CATEGORIES = [
  "Rezsi",
  "Eszköz / gép",
  "Termék / alapanyag",
  "Szoftver / előfizetés",
  "Bérleti díj",
  "Könyvelés / admin",
  "Marketing",
  "Egyéb",
] as const;

export const expensesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().optional() }))
    .query(({ ctx, input }) => {
      const from = input.month
        ? new Date(input.year, input.month - 1, 1)
        : new Date(input.year, 0, 1);
      const to = input.month
        ? new Date(input.year, input.month, 1)
        : new Date(input.year + 1, 0, 1);
      return ctx.db.expense.findMany({
        where: { date: { gte: from, lt: to } },
        orderBy: { date: "desc" },
        include: { createdBy: { select: { name: true } } },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      title:    z.string().min(1),
      amount:   z.number().positive(),
      date:     z.string(),
      category: z.string().default("Egyéb"),
      notes:    z.string().optional(),
      paid:     z.boolean().default(true),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.expense.create({
        data: {
          title:      input.title,
          amount:     input.amount,
          date:       new Date(input.date),
          category:   input.category,
          notes:      input.notes,
          paid:       input.paid,
          createdById: ctx.session.user.id,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id:       z.string(),
      title:    z.string().min(1).optional(),
      amount:   z.number().positive().optional(),
      date:     z.string().optional(),
      category: z.string().optional(),
      notes:    z.string().optional(),
      paid:     z.boolean().optional(),
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
        },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.expense.delete({ where: { id: input.id } })),
});
