import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, salonProcedure } from "~/server/api/trpc";
import { appUrl } from "~/server/booking-public";
import { isConfigured, send } from "~/server/email";
import { confirmed, declined } from "~/server/email-templates";
import { pushToGoogle } from "~/server/api/routers/appointments";

/**
 * A nyilvános foglalóból érkezett kérések elbírálása.
 *
 * Szándékosan a naptárban történik, nem külön adminfelületen: a kérés ott
 * jelenik meg, ahova szólna, így látod mellette, mi van aznap — enélkül egy
 * listából kellene fejben összeraknod, belefér-e.
 */

/** Csak a megerősített kérések várnak döntésre. */
const PENDING = "kert";

export const bookingsRouter = createTRPCRouter({
  /** Egy időszak elbírálásra váró kérései. */
  pending: salonProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.booking.findMany({
        where: {
          status:   PENDING,
          startsAt: { gte: new Date(input.from), lte: new Date(input.to) },
          ...(ctx.session.user.role === "admin" ? {} : { workerId: ctx.session.user.id }),
        },
        orderBy: { startsAt: "asc" },
        include: { worker: { select: { id: true, name: true } } },
      })
    ),

  /**
   * Elfogadás. Ekkor keletkezik a vendég és az előjegyzés — addig a kérés
   * nem szennyezi a receptkönyvet.
   */
  accept: salonProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.db.booking.findUnique({
        where:   { id: input.id },
        include: { worker: { select: { id: true, name: true } } },
      });
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen kérés." });
      if (b.status !== PENDING)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ezt a kérést már elbírálták." });

      // Vendég: a meglévőt keressük meg név szerint, hogy ne szaporodjanak.
      const name  = b.name.trim();
      const guest = await ctx.db.guest.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      }) ?? await ctx.db.guest.create({
        data: { name, phone: b.phone },
      });

      const appointment = await ctx.db.appointment.create({
        data: {
          workerId:    b.workerId,
          start:       b.startsAt,
          end:         b.endsAt,
          guestId:     guest.id,
          guestName:   name,
          phone:       b.phone,
          services:    b.service,
          notes:       b.note,
          createdById: ctx.session.user.id,
        },
      });
      await pushToGoogle(ctx.db, appointment.id);

      await ctx.db.booking.update({
        where: { id: b.id },
        data:  { status: "elfogadva", guestId: guest.id },
      });

      if (isConfigured()) {
        const mail = confirmed({
          guestName: name, service: b.service,
          workerName: b.worker.name ?? "", start: b.startsAt,
          // Saját link a vendégnek: itt nézheti meg és mondhatja le. Enélkül
          // csak telefonon tudna szólni, ami mindkettőtöknek macerásabb.
          link: `${appUrl()}/foglalas/${b.token}`,
        });
        // A levél elakadása ne vonja vissza az elfogadást — az időpont már áll.
        try { await send({ to: { email: b.email, name }, subject: mail.subject, html: mail.html }); }
        catch { /* a naptárban akkor is ott van */ }
      }

      return { ok: true, appointmentId: appointment.id };
    }),

  /** Elutasítás: a sáv felszabadul, a vendég udvarias levelet kap. */
  decline: salonProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.db.booking.findUnique({
        where:   { id: input.id },
        include: { worker: { select: { name: true } } },
      });
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen kérés." });
      if (b.status !== PENDING)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ezt a kérést már elbírálták." });

      await ctx.db.booking.update({ where: { id: b.id }, data: { status: "elutasitva" } });

      if (isConfigured()) {
        const mail = declined({
          guestName: b.name, service: b.service,
          workerName: b.worker.name ?? "", start: b.startsAt,
        }, input.reason);
        try { await send({ to: { email: b.email, name: b.name }, subject: mail.subject, html: mail.html }); }
        catch { /* az elutasítás akkor is megtörtént */ }
      }

      return { ok: true };
    }),
});
