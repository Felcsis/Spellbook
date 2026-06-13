import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Csak admin módosíthatja az árlistát." });
  }
}

export const servicesRouter = createTRPCRouter({
  // Mindenki látja az árlistát (staff is)
  listCategories: protectedProcedure.query(({ ctx }) =>
    ctx.db.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        services: {
          orderBy: { order: "asc" },
        },
      },
    })
  ),

  // Az alábbiak csak adminnak
  createCategory: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const last = await ctx.db.serviceCategory.findFirst({
        orderBy: { order: "desc" },
        select:  { order: true },
      });
      return ctx.db.serviceCategory.create({
        data: { name: input.name, order: (last?.order ?? -1) + 1, userId: ctx.session.user.id },
      });
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      return ctx.db.serviceCategory.update({
        where: { id: input.id },
        data:  { name: input.name },
      });
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      return ctx.db.serviceCategory.delete({ where: { id: input.id } });
    }),

  createService: protectedProcedure
    .input(z.object({
      categoryId:  z.string(),
      name:        z.string().min(1),
      price:       z.number().nonnegative(),
      duration:    z.number().int().positive().default(30),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const last = await ctx.db.service.findFirst({
        where:   { categoryId: input.categoryId },
        orderBy: { order: "desc" },
        select:  { order: true },
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
      requireAdmin(ctx.session.user.role);
      const { id, ...data } = input;
      return ctx.db.service.update({ where: { id }, data });
    }),

  deleteService: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      return ctx.db.service.delete({ where: { id: input.id } });
    }),

  reorderServices: protectedProcedure
    .input(z.array(z.object({ id: z.string(), order: z.number().int() })))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      await ctx.db.$transaction(
        input.map(({ id, order }) => ctx.db.service.update({ where: { id }, data: { order } }))
      );
    }),
});
