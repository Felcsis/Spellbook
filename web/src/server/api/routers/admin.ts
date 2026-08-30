import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { entryWageAmount } from "~/lib/wage";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Csak admin számára elérhető." });
}

export const adminRouter = createTRPCRouter({
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);
    return ctx.db.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, archivedAt: true, priceListType: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  }),

  // Mindenki által elérhető — csak nevet és id-t ad vissza
  listStaff: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  ),

  createUser: protectedProcedure
    .input(z.object({
      name:     z.string().min(1),
      email:    z.string().email(),
      password: z.string().min(4),
      role:     z.enum(["admin", "staff"]),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ez az email már foglalt." });
      const hashed = await hash(input.password, 12);
      return ctx.db.user.create({
        data: { name: input.name, email: input.email, password: hashed, role: input.role, priceListType: input.role === "admin" ? "master" : "beginner" },
        select: { id: true, name: true, email: true, role: true, priceListType: true },
      });
    }),

  updateUser: protectedProcedure
    .input(z.object({
      id:            z.string(),
      name:          z.string().min(1).optional(),
      email:         z.string().email().optional(),
      role:          z.enum(["admin", "staff"]).optional(),
      priceListType: z.enum(["master", "beginner"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const { id, ...data } = input;
      return ctx.db.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, priceListType: true },
      });
    }),

  changePassword: protectedProcedure
    .input(z.object({ id: z.string(), password: z.string().min(4) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const hashed = await hash(input.password, 12);
      return ctx.db.user.update({ where: { id: input.id }, data: { password: hashed }, select: { id: true } });
    }),

  // Archiválás: a dolgozó nem léphet be és nem választható új munkához,
  // de minden pénzügyi előzménye/statisztikája megmarad, attribútálva.
  archiveUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      if (input.id === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Saját magadat nem archiválhatod." });
      // Hozzáférés megvonása: aktív munkamenetek törlése + jelszó érvénytelenítése.
      await ctx.db.session.deleteMany({ where: { userId: input.id } });
      return ctx.db.user.update({
        where: { id: input.id },
        data: { active: false, archivedAt: new Date(), password: null },
        select: { id: true, active: true },
      });
    }),

  restoreUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      return ctx.db.user.update({
        where: { id: input.id },
        data: { active: true, archivedAt: null },
        select: { id: true, active: true },
      });
    }),

  // Végső elszámolás egy dolgozóhoz: teljes eddigi termelt bevétel, bér, anyag.
  staffSettlement: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const rows = await ctx.db.financeEntry.findMany({
        where: { OR: [{ workDay: { userId: input.userId } }, { workDayId: null, createdById: input.userId }] },
        include: {
          guestCard: { include: { services: { select: { name: true, price: true, categoryName: true } } } },
          workDay: { include: { services: { include: { service: { select: { name: true, price: true, category: { select: { name: true } } } } } } } },
        },
        orderBy: { date: "asc" },
      });
      let revenue = 0, material = 0, wage = 0, wageEstimate = 0, count = 0;
      let firstDate: Date | null = null, lastDate: Date | null = null;
      rows.forEach(e => {
        if (e.type === "revenue") { revenue += e.amount; count += 1; }
        if (e.type === "material") material += e.amount;
        if (e.type === "wage") wage += e.amount;
        wageEstimate += entryWageAmount(e);
        const d = new Date(e.date);
        if (!firstDate || d < firstDate) firstDate = d;
        if (!lastDate || d > lastDate) lastDate = d;
      });
      const user = await ctx.db.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true, active: true, archivedAt: true } });
      return {
        user, revenue, material, wage, wageEstimate, count,
        firstDate: firstDate ? (firstDate as Date).toISOString() : null,
        lastDate: lastDate ? (lastDate as Date).toISOString() : null,
      };
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      if (input.id === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Saját magadat nem törölheted." });
      return ctx.db.user.delete({ where: { id: input.id } });
    }),

  staffFinances: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const start = new Date(input.year, input.month - 1, 1);
      const end   = new Date(input.year, input.month, 0, 23, 59, 59, 999);
      const entries = await ctx.db.financeEntry.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          createdBy: { select: { id: true, name: true } },
          workDay:   { select: { userId: true } },
        },
        orderBy: { date: "asc" },
      });
      return entries;
    }),
});
