import { z } from "zod";
import { PRICE_LIST_KEYS } from "~/lib/price-lists";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { db } from "~/server/db";

/**
 * A saját szolgáltatásait mindenki maga kezeli.
 *
 * A kozmetikus a saját kezeléseit veszi fel, a fodrász árakhoz viszont nem
 * nyúlhat. Ezért nem a szerepkör dönt, hanem az, hogy KIÉ a kategória: azé,
 * aki létrehozta. Az admin mindenhez hozzáfér.
 *
 * A felületen ugyanez látszik (a más kategóriáján nincs szerkesztő gomb), de
 * az elrejtés önmagában nem védelem — a végpont közvetlenül is hívható.
 */
type Ctx = { db: typeof db; session: { user: { id: string; role: string } } };

async function assertOwnsCategory(ctx: Ctx, categoryId: string) {
  if (ctx.session.user.role === "admin") return;
  const cat = await ctx.db.serviceCategory.findUnique({
    where:  { id: categoryId },
    select: { userId: true },
  });
  if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen kategória." });
  if (cat.userId !== ctx.session.user.id)
    throw new TRPCError({ code: "FORBIDDEN", message: "Ez a kategória nem a tiéd." });
}

/** Ugyanez egy szolgáltatásra: a kategóriája dönti el, kié. */
async function assertOwnsService(ctx: Ctx, serviceId: string) {
  if (ctx.session.user.role === "admin") return;
  const svc = await ctx.db.service.findUnique({
    where:  { id: serviceId },
    select: { category: { select: { userId: true } } },
  });
  if (!svc) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen szolgáltatás." });
  if (svc.category.userId !== ctx.session.user.id)
    throw new TRPCError({ code: "FORBIDDEN", message: "Ez a szolgáltatás nem a tiéd." });
}

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

  // Kategóriát bárki vehet fel — az lesz a gazdája. Módosítani és törölni
  // csak a sajátját tudja; az admin mindenkiét.
  createCategory: protectedProcedure
    .input(z.object({ name: z.string().min(1), priceListType: z.enum(PRICE_LIST_KEYS).default("master") }))
    .mutation(async ({ ctx, input }) => {
      // Aki nem admin, csak a saját árlistájára vehet fel kategóriát: a
      // kozmetikus ne tudjon a fodrász listába nyúlni, és fordítva.
      if (ctx.session.user.role !== "admin") {
        const me = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id }, select: { priceListType: true },
        });
        if (me?.priceListType !== input.priceListType)
          throw new TRPCError({ code: "FORBIDDEN", message: "Csak a saját árlistádra vehetsz fel kategóriát." });
      }
      const last = await ctx.db.serviceCategory.findFirst({
        where:   { priceListType: input.priceListType },
        orderBy: { order: "desc" },
        select:  { order: true },
      });
      return ctx.db.serviceCategory.create({
        data: { name: input.name, priceListType: input.priceListType, order: (last?.order ?? -1) + 1, userId: ctx.session.user.id },
      });
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsCategory(ctx, input.id);
      return ctx.db.serviceCategory.update({
        where: { id: input.id },
        data:  { name: input.name },
      });
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsCategory(ctx, input.id);
      return ctx.db.serviceCategory.delete({ where: { id: input.id } });
    }),

  createService: protectedProcedure
    .input(z.object({
      categoryId:  z.string(),
      name:        z.string().min(1),
      price:       z.number().nonnegative(),
      duration:    z.number().int().positive().default(30),
      description: z.string().optional(),
      perHour:     z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsCategory(ctx, input.categoryId);
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
          perHour:     input.perHour ?? false,
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
      perHour:     z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsService(ctx, input.id);
      const { id, ...data } = input;
      return ctx.db.service.update({ where: { id }, data });
    }),

  deleteService: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsService(ctx, input.id);
      return ctx.db.service.delete({ where: { id: input.id } });
    }),

  reorderServices: protectedProcedure
    .input(z.array(z.object({ id: z.string(), order: z.number().int() })))
    .mutation(async ({ ctx, input }) => {
      // Sorrendezni csak a sajátjai között lehet.
      for (const { id } of input) await assertOwnsService(ctx, id);
      await ctx.db.$transaction(
        input.map(({ id, order }) => ctx.db.service.update({ where: { id }, data: { order } }))
      );
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      priceListType: z.enum(PRICE_LIST_KEYS).default("master"),
      categories: z.array(z.object({
        name: z.string().min(1),
        services: z.array(z.object({
          name:     z.string().min(1),
          price:    z.number().nonnegative(),
          duration: z.number().int().positive().default(30),
        })),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const userId = ctx.session.user.id;

      const lastCat = await ctx.db.serviceCategory.findFirst({
        where:   { priceListType: input.priceListType },
        orderBy: { order: "desc" },
        select:  { order: true },
      });
      let catOrder = (lastCat?.order ?? -1) + 1;

      for (const cat of input.categories) {
        const created = await ctx.db.serviceCategory.create({
          data: { name: cat.name, priceListType: input.priceListType, order: catOrder++, userId },
        });
        await ctx.db.$transaction(
          cat.services.map((svc, i) =>
            ctx.db.service.create({
              data: { name: svc.name, price: svc.price, duration: svc.duration, order: i, categoryId: created.id, userId },
            })
          )
        );
      }
    }),
});
