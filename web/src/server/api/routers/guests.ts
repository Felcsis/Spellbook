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
  name:  z.string().min(1),
  price: z.number().min(0),
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

  deleteCard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.guestCard.delete({ where: { id: input.id } })),

  deleteGuest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.guest.delete({ where: { id: input.id } })),
});
