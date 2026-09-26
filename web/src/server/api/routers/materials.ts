import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PRICE_LIST_KEYS, type PriceList } from "~/lib/price-lists";

/**
 * Anyagtár — árlistánként külön.
 *
 * A kozmetikusnak a szőkítőpor és a hajfesték nem mond semmit, a fodrásznak a
 * gyantalap nem. Ezért mindenki a SAJÁT árlistájának anyagait látja, és oda
 * vesz fel újat; az admin azt a listát kezeli, amelyiket épp nézi.
 *
 * A szűrés a szerveren történik, nem a felületen: a végpont közvetlenül is
 * hívható lenne.
 */

/** A hívó árlistája; adminnál felülírható azzal, amit épp néz. */
async function listOf(
  ctx: { db: { user: { findUnique: (a: { where: { id: string }; select: { priceListType: true } }) => Promise<{ priceListType: string } | null> } };
         session: { user: { id: string; role: string } } },
  wanted?: PriceList,
): Promise<string> {
  if (ctx.session.user.role === "admin" && wanted) return wanted;
  const me = await ctx.db.user.findUnique({
    where:  { id: ctx.session.user.id },
    select: { priceListType: true },
  });
  return me?.priceListType ?? "master";
}

/** A más listájához tartozó anyaghoz ne lehessen hozzányúlni. */
async function assertOwn(
  ctx: { db: { material: { findUnique: (a: { where: { id: string }; select: { priceListType: true } }) => Promise<{ priceListType: string } | null> };
               user: { findUnique: (a: { where: { id: string }; select: { priceListType: true } }) => Promise<{ priceListType: string } | null> } };
         session: { user: { id: string; role: string } } },
  id: string,
) {
  if (ctx.session.user.role === "admin") return;
  const mat = await ctx.db.material.findUnique({ where: { id }, select: { priceListType: true } });
  if (!mat) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen anyag." });
  const mine = await listOf(ctx);
  if (mat.priceListType !== mine)
    throw new TRPCError({ code: "FORBIDDEN", message: "Ez az anyag nem a te árlistádon van." });
}

const listInput = z.object({ priceListType: z.enum(PRICE_LIST_KEYS).optional() }).optional();

export const materialsRouter = createTRPCRouter({
  /** A színrecept márkái — mindenki ugyanazt a listát látja. */
  brands: protectedProcedure.query(({ ctx }) =>
    ctx.db.materialBrand.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } })
  ),

  /** Új márka a színreceptből; ha már van (kis-nagybetűtől függetlenül), azt adja vissza. */
  addBrand: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.materialBrand.findFirst({
        where:  { name: { equals: input.name, mode: "insensitive" } },
        select: { id: true, name: true, active: true },
      });
      if (existing) {
        if (!existing.active) await ctx.db.materialBrand.update({ where: { id: existing.id }, data: { active: true } });
        return { id: existing.id, name: existing.name };
      }
      return ctx.db.materialBrand.create({ data: { name: input.name, order: 100 }, select: { id: true, name: true } });
    }),

  list: protectedProcedure
    .input(listInput)
    .query(async ({ ctx, input }) =>
      ctx.db.material.findMany({
        where:   { active: true, priceListType: await listOf(ctx, input?.priceListType) },
        orderBy: { order: "asc" },
      })
    ),

  listAll: protectedProcedure
    .input(listInput)
    .query(async ({ ctx, input }) =>
      ctx.db.material.findMany({
        where:   { priceListType: await listOf(ctx, input?.priceListType) },
        orderBy: { order: "asc" },
      })
    ),

  create: protectedProcedure
    .input(z.object({
      name:  z.string().min(1),
      price: z.number().min(0),
      unit:  z.string().optional(),
      priceListType: z.enum(PRICE_LIST_KEYS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const list = await listOf(ctx, input.priceListType);
      const last = await ctx.db.material.findFirst({
        where:   { priceListType: list },
        orderBy: { order: "desc" },
      });
      return ctx.db.material.create({
        data: {
          name: input.name, price: input.price, unit: input.unit,
          order: (last?.order ?? -1) + 1, priceListType: list,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id:    z.string(),
      name:  z.string().min(1).optional(),
      price: z.number().min(0).optional(),
      unit:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(ctx, input.id);
      const { id, ...data } = input;
      return ctx.db.material.update({ where: { id }, data });
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(ctx, input.id);
      return ctx.db.material.update({ where: { id: input.id }, data: { active: input.active } });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(ctx, input.id);
      return ctx.db.material.delete({ where: { id: input.id } });
    }),
});
