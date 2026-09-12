import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { log } from "~/server/api/routers/gdpr";
import { suggestFromRecipe } from "~/server/guest-match";

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

  /**
   * "Kire gondolsz?" — a beírt szín-recept alapján javasol vendéget.
   *
   * Csak az elmúlt 18 hónap kártyáit nézzük: egy két éve használt szín már nem
   * mond semmit arról, ki ül most a székben, viszont sokat lassítana.
   */
  suggestByRecipe: protectedProcedure
    .input(z.object({
      materials: z.array(z.object({
        name:      z.string(),
        brand:     z.string().optional().nullable(),
        colorCode: z.string().optional().nullable(),
      })),
      services: z.array(z.string()),
    }))
    .query(async ({ ctx, input }) => {
      if (input.materials.length === 0 && input.services.length === 0) return [];

      const since = new Date();
      since.setMonth(since.getMonth() - 18);

      const cards = await ctx.db.guestCard.findMany({
        where:   { date: { gte: since } },
        orderBy: { date: "desc" },
        take:    1500,
        select: {
          date:      true,
          guestId:   true,
          guest:     { select: { name: true } },
          materials: { select: { name: true, brand: true, colorCode: true } },
          services:  { select: { name: true } },
        },
      });

      return suggestFromRecipe(
        input,
        cards.map(c => ({
          guestId:   c.guestId,
          guestName: c.guest.name,
          date:      c.date,
          materials: c.materials,
          services:  c.services,
        })),
      );
    }),

  /**
   * Vendég keresése név alapján, és ha nincs, létrehozása. A Google Naptárból
   * behozott időpont címe ilyen néven érkezik, és nem akarunk duplikátumot.
   */
  findOrCreateGuest: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const name     = input.name.trim();
      const existing = await ctx.db.guest.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      return existing ?? ctx.db.guest.create({ data: { name } });
    }),

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

  getCard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.guestCard.findUnique({
        where: { id: input.id },
        include: {
          guest:     true,
          worker:    { select: { id: true, name: true } },
          services:  true,
          materials: true,
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

  // My cards — yearly stats for staff (services breakdown)
  myCardsYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(({ ctx, input }) => {
      const from = new Date(input.year, 0, 1);
      const to   = new Date(input.year + 1, 0, 1);
      return ctx.db.guestCard.findMany({
        where: { workerId: ctx.session.user.id, date: { gte: from, lt: to } },
        select: {
          total: true,
          services: { select: { name: true, price: true, categoryName: true } },
          materials: { select: { lineTotal: true } },
        },
      });
    }),

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
      discount:  z.number().min(0).default(0),
      // Ha Google Naptár-időpontból készült, ide kerül az esemény azonosítója —
      // így ugyanabból az időpontból nem lesz két kártya.
      googleEventId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svcTotal = input.services.reduce((s, x) => s + x.price, 0);
      const matTotal = input.materials.reduce((s, x) => s + x.lineTotal, 0);
      const discountedSvcTotal = Math.max(0, svcTotal - input.discount);
      const date = new Date(input.date);
      const card = await ctx.db.guestCard.create({
        data: {
          guestId:  input.guestId,
          workerId: input.workerId,
          date,
          notes:    input.notes,
          total:    discountedSvcTotal + matTotal,
          googleEventId: input.googleEventId ?? null,
          services:  { create: input.services },
          materials: { create: input.materials },
        },
        include: { guest: true, worker: { select: { id: true, name: true } }, services: true, materials: true },
      });
      if (discountedSvcTotal > 0) {
        const svcDesc = card.services.map(s => s.name).join(", ");
        const desc = input.discount > 0 ? `${svcDesc} (${Math.round(input.discount)} Ft kedvezmény)` : svcDesc;
        await ctx.db.financeEntry.create({ data: { type: "revenue", description: desc, amount: discountedSvcTotal, date, createdById: card.workerId, guestCardId: card.id } });
      }
      if (matTotal > 0)
        await ctx.db.financeEntry.create({ data: { type: "material", description: card.materials.map(m => `${m.name} (${m.grams}g)`).join(", "), amount: matTotal, date, createdById: card.workerId, guestCardId: card.id } });
      return card;
    }),

  updateCard: protectedProcedure
    .input(z.object({
      id:        z.string(),
      date:      z.string().optional(),
      notes:     z.string().optional(),
      workerId:  z.string().optional(),
      services:  z.array(ServiceInput).optional(),
      materials: z.array(MaterialInput).optional(),
      discount:  z.number().min(0).default(0),
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
      const svcTotal          = fetched.services.reduce((s, x) => s + x.price, 0);
      const matTotal          = fetched.materials.reduce((s, x) => s + x.lineTotal, 0);
      const discountedSvcTotal = Math.max(0, svcTotal - input.discount);
      const total              = discountedSvcTotal + matTotal;

      const card = await ctx.db.guestCard.update({
        where: { id: input.id },
        data:  { total },
        include: { guest: true, worker: { select: { id: true, name: true } }, services: true, materials: true },
      });

      // Sync linked finance entries
      const date = fetched.date;
      await ctx.db.financeEntry.deleteMany({ where: { guestCardId: input.id } });
      if (discountedSvcTotal > 0)
        await ctx.db.financeEntry.create({ data: { type: "revenue", description: `${card.services.map(s => s.name).join(", ")}${input.discount > 0 ? ` (${input.discount} Ft kedvezmény)` : ""}`, amount: discountedSvcTotal, date, createdById: card.workerId, guestCardId: input.id } });
      if (matTotal > 0)
        await ctx.db.financeEntry.create({ data: { type: "material", description: card.materials.map(m => `${m.name} (${m.grams}g)`).join(", "), amount: matTotal, date, createdById: card.workerId, guestCardId: input.id } });

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

  // A törlés naplózandó (GDPR 5. cikk (2) — elszámoltathatóság): a vendég és a
  // kártyái eltűnnek, ezért a bizonyíték csak a GdprLog-ban marad meg.
  deleteGuest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const guest = await ctx.db.guest.findUnique({
        where: { id: input.id },
        select: { id: true, name: true, _count: { select: { cards: true } } },
      });
      const deleted = await ctx.db.guest.delete({ where: { id: input.id } });
      if (guest) {
        await log(ctx, {
          action: "delete",
          subject: guest.name,
          subjectId: guest.id,
          detail: `${guest._count.cards} kártya`,
        });
      }
      return deleted;
    }),
});
