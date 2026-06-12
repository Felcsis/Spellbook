import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const servicesRouter = createTRPCRouter({
  // --- Categories ---
  listCategories: protectedProcedure.query(({ ctx }) =>
    ctx.db.serviceCategory.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { order: "asc" },
      include: {
        services: {
          where: { userId: ctx.session.user.id },
          orderBy: { order: "asc" },
        },
      },
    })
  ),

  createCategory: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.serviceCategory.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      return ctx.db.serviceCategory.create({
        data: {
          name: input.name,
          order: (last?.order ?? -1) + 1,
          userId: ctx.session.user.id,
        },
      });
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.serviceCategory.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { name: input.name },
      })
    ),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.serviceCategory.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),

  // --- Services ---
  createService: protectedProcedure
    .input(z.object({
      categoryId:  z.string(),
      name:        z.string().min(1),
      price:       z.number().nonnegative(),
      duration:    z.number().int().positive().default(30),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.service.findFirst({
        where: { categoryId: input.categoryId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      return ctx.db.service.create({
        data: {
          name:        input.name,
          price:       input.price,
          duration:    input.duration,
          description: input.description,
          order:       (last?.order ?? -1) + 1,
          categoryId:  input.categoryId,
          userId:      ctx.session.user.id,
        },
      });
    }),

  updateService: protectedProcedure
    .input(z.object({
      id:          z.string(),
      name:        z.string().min(1).optional(),
      price:       z.number().nonnegative().optional(),
      duration:    z.number().int().positive().optional(),
      description: z.string().optional(),
      active:      z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.service.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }),

  deleteService: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.service.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),
});
