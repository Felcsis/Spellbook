import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const materialsRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.material.findMany({
      where:   { active: true },
      orderBy: { order: "asc" },
    })
  ),

  listAll: protectedProcedure.query(({ ctx }) =>
    ctx.db.material.findMany({ orderBy: { order: "asc" } })
  ),

  create: protectedProcedure
    .input(z.object({
      name:  z.string().min(1),
      price: z.number().min(0),
      unit:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.material.findFirst({ orderBy: { order: "desc" } });
      return ctx.db.material.create({
        data: { name: input.name, price: input.price, unit: input.unit, order: (last?.order ?? -1) + 1 },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id:    z.string(),
      name:  z.string().min(1).optional(),
      price: z.number().min(0).optional(),
      unit:  z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.material.update({ where: { id }, data });
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.material.update({ where: { id: input.id }, data: { active: input.active } })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.material.delete({ where: { id: input.id } })),
});
