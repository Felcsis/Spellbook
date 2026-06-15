import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const MaterialInput = z.object({
  name:      z.string().min(1),
  brand:     z.string().optional(),
  colorCode: z.string().optional(),
  grams:     z.number().min(0),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
});

const ServiceInput = z.object({
  name:         z.string().min(1),
  price:        z.number().min(0),
  duration:     z.number().min(0).default(0),
  gender:       z.string().optional(),
  categoryName: z.string().optional(),
});

export const guestsRouter = createTRPCRouter({
  // Guest CRUD
  listGuests: protectedProcedure.query(({ ctx }) =>
    ctx.db.guest.findMany({ orderBy: { name: "asc" } })
  ),

  createGuest: protectedProcedure
    .input(z.object({ name: z.string().min(1), phone: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.guest.create({ data: { name: input.name, phone: input.phone } })
    ),

  // Recept könyv — vendégenként csoportosítva az összes kártyával
  guestBook: protectedProcedure.query(({ ctx }) =>
    ctx.db.guest.findMany({
      orderBy: { name: "asc" },
      include: {
        cards: {
          orderBy: { date: "desc" },
          include: {
            worker:    { select: { id: true, name: true } },
            services:  true,
            materials: true,
          },
        },
      },
    })
  ),

  // Guest cards
  listCards: protectedProcedure
    .input(z.object({ guestId: z.string().optional() }))
    .query(({ ctx, input }) =>
      ctx.db.guestCard.findMany({
        where:   input.guestId ? { guestId: input.guestId } : undefined,
        include: {
          guest:     true,
          worker:    { select: { id: true, name: true } },
          services:  true,
          materials: true,
        },
        orderBy: { date: "desc" },
      })
    ),

  // My cards — for staff finance view (filtered by workerId + date range)
  myCards: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month, 1);
      return ctx.db.guestCard.findMany({
        where: { workerId: ctx.session.user.id, date: { gte: from, lt: to } },
        include: {
          guest:    { select: { name: true } },
          services: true,
          materials: true,
        },
        orderBy: { date: "desc" },
      });
    }),

  createCard: protectedProcedure
    .input(z.object({
      guestId:   z.string(),
      workerId:  z.string(),
      date:      z.string(),
      notes:     z.string().optional(),
      services:  z.array(ServiceInput),
      materials: z.array(MaterialInput),
    }))
    .mutation(async ({ ctx, input }) => {
      const svcTotal = input.services.reduce((s, x) => s + x.price, 0);
      const matTotal = input.materials.reduce((s, x) => s + x.lineTotal, 0);
      return ctx.db.guestCard.create({
        data: {
          guestId:  input.guestId,
          workerId: input.workerId,
          date:     new Date(input.date),
          notes:    input.notes,
          total:    svcTotal + matTotal,
          services:  { create: input.services },
          materials: { create: input.materials },
        },
        include: { guest: true, worker: { select: { id: true, name: true } }, services: true, materials: true },
      });
    }),

  updateCard: protectedProcedure
    .input(z.object({
      id:        z.string(),
      date:      z.string().optional(),
      notes:     z.string().optional(),
      workerId:  z.string().optional(),
      services:  z.array(ServiceInput).optional(),
      materials: z.array(MaterialInput).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.services !== undefined) {
        await ctx.db.guestCardService.deleteMany({ where: { cardId: input.id } });
        if (input.services.length > 0)
          await ctx.db.guestCardService.createMany({ data: input.services.map(s => ({ ...s, cardId: input.id })) });
      }
      if (input.materials !== undefined) {
        await ctx.db.guestCardMaterial.deleteMany({ where: { cardId: input.id } });
        if (input.materials.length > 0)
          await ctx.db.guestCardMaterial.createMany({ data: input.materials.map(m => ({ ...m, cardId: input.id })) });
      }

      const fetched = await ctx.db.guestCard.update({
        where: { id: input.id },
        data: {
          ...(input.date     && { date: new Date(input.date) }),
          ...(input.workerId && { workerId: input.workerId }),
          notes: input.notes ?? undefined,
        },
        include: { services: true, materials: true },
      });
      const svcTotal = fetched.services.reduce((s, x) => s + x.price, 0);
      const matTotal = fetched.materials.reduce((s, x) => s + x.lineTotal, 0);
      const total    = svcTotal + matTotal;

      const card = await ctx.db.guestCard.update({
        where: { id: input.id },
        data:  { total },
        include: { guest: true, worker: { select: { id: true, name: true } }, services: true, materials: true },
      });

      // Sync linked finance entries
      const date = fetched.date;
      await ctx.db.financeEntry.deleteMany({ where: { guestCardId: input.id } });
      if (svcTotal > 0)
        await ctx.db.financeEntry.create({ data: { type: "revenue",  description: card.services.map(s => s.name).join(", "), amount: svcTotal, date, createdById: ctx.session.user.id, guestCardId: input.id } });
      if (matTotal > 0)
        await ctx.db.financeEntry.create({ data: { type: "material", description: card.materials.map(m => `${m.name} (${m.grams}g)`).join(", "), amount: matTotal, date, createdById: ctx.session.user.id, guestCardId: input.id } });

      return card;
    }),

  deleteCard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.financeEntry.deleteMany({ where: { guestCardId: input.id } });
      return ctx.db.guestCard.delete({ where: { id: input.id } });
    }),

  updateGuest: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), phone: z.string().optional(), notes: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.guest.update({ where: { id: input.id }, data: { name: input.name, phone: input.phone ?? null, notes: input.notes ?? null } })
    ),

  deleteGuest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.guest.delete({ where: { id: input.id } })),
});
