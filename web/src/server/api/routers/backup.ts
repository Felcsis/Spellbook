import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

// ── Export ─────────────────────────────────────────────────────────────────────

export const backupRouter = createTRPCRouter({
  export: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);

    const [
      users, guests, guestCards, financeEntries,
      workDays, expenses, serviceCategories, services, materials,
    ] = await Promise.all([
      ctx.db.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
      ctx.db.guest.findMany(),
      ctx.db.guestCard.findMany({
        include: {
          services:  true,
          materials: true,
          worker:    { select: { email: true } },
        },
      }),
      ctx.db.financeEntry.findMany({
        include: { createdBy: { select: { email: true } } },
      }),
      ctx.db.workDay.findMany({
        include: {
          user:     { select: { email: true } },
          services: true,
        },
      }),
      ctx.db.expense.findMany({
        include: {
          createdBy:  { select: { email: true } },
          assignedTo: { select: { email: true } },
        },
      }),
      ctx.db.serviceCategory.findMany({
        include: { user: { select: { email: true } } },
      }),
      ctx.db.service.findMany({
        include: { user: { select: { email: true } } },
      }),
      ctx.db.material.findMany(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      users,
      guests,
      guestCards,
      financeEntries,
      workDays,
      expenses,
      serviceCategories,
      services,
      materials,
    };
  }),

  // ── Import ─────────────────────────────────────────────────────────────────

  import: protectedProcedure
    .input(z.object({
      data: z.string(), // JSON string of the exported backup
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const backup = JSON.parse(input.data) as {
        version?: number;
        users: { id: string; name: string | null; email: string | null; role: string }[];
        guests: { id: string; name: string; phone: string | null; notes: string | null; createdAt: string }[];
        guestCards: {
          id: string; date: string; guestId: string; workerId: string; total: number; notes: string | null; createdAt: string;
          worker: { email: string | null };
          services: { id: string; cardId: string; name: string; price: number; duration: number; gender: string | null; categoryName: string | null }[];
          materials: { id: string; cardId: string; name: string; brand: string | null; colorCode: string | null; grams: number; unitPrice: number; lineTotal: number }[];
        }[];
        financeEntries: {
          id: string; type: string; description: string; amount: number; date: string; createdAt: string;
          createdById: string; workDayId: string | null; guestCardId: string | null; visitGroupId: string | null;
          createdBy: { email: string | null };
        }[];
        workDays: {
          id: string; date: string; userId: string; earnings: number; notes: string | null;
          user: { email: string | null };
          services: { id: string; workDayId: string; serviceId: string; quantity: number; priceSnap: number }[];
        }[];
        expenses: {
          id: string; title: string; amount: number; date: string; category: string; notes: string | null;
          paid: boolean; createdAt: string; createdById: string; assignedToId: string | null;
          createdBy: { email: string | null };
          assignedTo: { email: string | null } | null;
        }[];
        serviceCategories: {
          id: string; name: string; order: number; priceListType: string; createdAt: string; userId: string;
          user: { email: string | null };
        }[];
        services: {
          id: string; name: string; price: number; duration: number; description: string | null;
          active: boolean; order: number; createdAt: string; categoryId: string; userId: string;
          user: { email: string | null };
        }[];
        materials: { id: string; name: string; price: number; unit: string | null; active: boolean; order: number; createdAt: string }[];
      };

      // Build email → current user ID map
      const currentUsers = await ctx.db.user.findMany({ select: { id: true, email: true } });
      const emailToId = new Map(currentUsers.map(u => [u.email, u.id]));

      function resolveUser(email: string | null | undefined, fallbackId: string): string {
        if (!email) return fallbackId;
        return emailToId.get(email) ?? fallbackId;
      }

      const counts = { guests: 0, guestCards: 0, financeEntries: 0, workDays: 0, expenses: 0, serviceCategories: 0, services: 0, materials: 0 };

      // 1. Guests
      for (const g of backup.guests) {
        await ctx.db.guest.upsert({
          where: { id: g.id },
          create: { id: g.id, name: g.name, phone: g.phone, notes: g.notes, createdAt: new Date(g.createdAt) },
          update: {},
        });
        counts.guests++;
      }

      // 2. Service categories
      for (const sc of backup.serviceCategories) {
        const userId = resolveUser(sc.user.email, ctx.session.user.id);
        await ctx.db.serviceCategory.upsert({
          where: { id: sc.id },
          create: { id: sc.id, name: sc.name, order: sc.order, priceListType: sc.priceListType, createdAt: new Date(sc.createdAt), userId },
          update: {},
        });
        counts.serviceCategories++;
      }

      // 3. Services
      for (const s of backup.services) {
        const userId = resolveUser(s.user.email, ctx.session.user.id);
        // Only create if category exists
        const catExists = await ctx.db.serviceCategory.findUnique({ where: { id: s.categoryId } });
        if (!catExists) continue;
        await ctx.db.service.upsert({
          where: { id: s.id },
          create: { id: s.id, name: s.name, price: s.price, duration: s.duration, description: s.description, active: s.active, order: s.order, createdAt: new Date(s.createdAt), categoryId: s.categoryId, userId },
          update: {},
        });
        counts.services++;
      }

      // 4. Materials catalog
      for (const m of backup.materials) {
        await ctx.db.material.upsert({
          where: { id: m.id },
          create: { id: m.id, name: m.name, price: m.price, unit: m.unit, active: m.active, order: m.order, createdAt: new Date(m.createdAt) },
          update: {},
        });
        counts.materials++;
      }

      // 5. WorkDays
      for (const wd of backup.workDays) {
        const userId = resolveUser(wd.user.email, ctx.session.user.id);
        await ctx.db.workDay.upsert({
          where: { id: wd.id },
          create: { id: wd.id, date: new Date(wd.date), userId, earnings: wd.earnings, notes: wd.notes },
          update: {},
        });
        counts.workDays++;
        for (const wds of wd.services) {
          const svcExists = await ctx.db.service.findUnique({ where: { id: wds.serviceId } });
          if (!svcExists) continue;
          await ctx.db.workDayService.upsert({
            where: { id: wds.id },
            create: { id: wds.id, workDayId: wds.workDayId, serviceId: wds.serviceId, quantity: wds.quantity, priceSnap: wds.priceSnap },
            update: {},
          });
        }
      }

      // 6. GuestCards + their services/materials
      for (const gc of backup.guestCards) {
        const workerId = resolveUser(gc.worker.email, ctx.session.user.id);
        const guestExists = await ctx.db.guest.findUnique({ where: { id: gc.guestId } });
        if (!guestExists) continue;
        await ctx.db.guestCard.upsert({
          where: { id: gc.id },
          create: { id: gc.id, date: new Date(gc.date), guestId: gc.guestId, workerId, total: gc.total, notes: gc.notes, createdAt: new Date(gc.createdAt) },
          update: {},
        });
        counts.guestCards++;
        for (const svc of gc.services) {
          await ctx.db.guestCardService.upsert({
            where: { id: svc.id },
            create: { id: svc.id, cardId: gc.id, name: svc.name, price: svc.price, duration: svc.duration, gender: svc.gender, categoryName: svc.categoryName },
            update: {},
          });
        }
        for (const mat of gc.materials) {
          await ctx.db.guestCardMaterial.upsert({
            where: { id: mat.id },
            create: { id: mat.id, cardId: gc.id, name: mat.name, brand: mat.brand, colorCode: mat.colorCode, grams: mat.grams, unitPrice: mat.unitPrice, lineTotal: mat.lineTotal },
            update: {},
          });
        }
      }

      // 7. FinanceEntries
      for (const fe of backup.financeEntries) {
        const createdById = resolveUser(fe.createdBy.email, ctx.session.user.id);
        // workDayId: only if workDay exists
        let workDayId: string | null = fe.workDayId;
        if (workDayId) {
          const wdExists = await ctx.db.workDay.findUnique({ where: { id: workDayId } });
          if (!wdExists) workDayId = null;
        }
        let guestCardId: string | null = fe.guestCardId;
        if (guestCardId) {
          const gcExists = await ctx.db.guestCard.findUnique({ where: { id: guestCardId } });
          if (!gcExists) guestCardId = null;
        }
        await ctx.db.financeEntry.upsert({
          where: { id: fe.id },
          create: { id: fe.id, type: fe.type, description: fe.description, amount: fe.amount, date: new Date(fe.date), createdAt: new Date(fe.createdAt), createdById, workDayId, guestCardId, visitGroupId: fe.visitGroupId },
          update: {},
        });
        counts.financeEntries++;
      }

      // 8. Expenses
      for (const ex of backup.expenses) {
        const createdById = resolveUser(ex.createdBy.email, ctx.session.user.id);
        const assignedToId = ex.assignedTo ? resolveUser(ex.assignedTo.email, ex.assignedToId ?? ctx.session.user.id) : null;
        await ctx.db.expense.upsert({
          where: { id: ex.id },
          create: { id: ex.id, title: ex.title, amount: ex.amount, date: new Date(ex.date), category: ex.category, notes: ex.notes, paid: ex.paid, createdAt: new Date(ex.createdAt), createdById, assignedToId },
          update: {},
        });
        counts.expenses++;
      }

      return counts;
    }),
});
