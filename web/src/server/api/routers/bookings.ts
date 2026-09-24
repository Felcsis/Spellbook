import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
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
 *
 * Mindenki a SAJÁT kéréseit bírálja el, az admin mindenkiét. Ezért nem a
 * `salonProcedure`-t használjuk: a "csak naptár" szerepkörű dolgozónak (pl. a
 * kozmetikusnak) is kezelnie kell a saját időpontjait, a szalon pénzügyei nélkül.
 */

/** Az admin bárkiét, más csak a sajátját. */
function assertOwn(role: string, userId: string, workerId: string) {
  if (role !== "admin" && workerId !== userId)
    throw new TRPCError({ code: "FORBIDDEN", message: "Ez nem a te időpontod." });
}

/** Csak a megerősített kérések várnak döntésre. */
const PENDING = "kert";

export const bookingsRouter = createTRPCRouter({
  /** Egy időszak elbírálásra váró kérései. */
  pending: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.booking.findMany({
        where: {
          status:   PENDING,
          startsAt: { gte: new Date(input.from), lte: new Date(input.to) },
          ...(ctx.session.user.role === "admin" ? {} : { workerId: ctx.session.user.id }),
        },
        orderBy: { startsAt: "asc" },
        include: { worker: { select: { id: true, name: true } } },
      });

      // Párban kért látogatásnál a kártyán látszania kell a másik félnek is:
      // enélkül az egyikőtök elfogadná a maga részét, és nem tudná, hogy a
      // vendég a kettőt egyben kérte.
      const groups = rows.map(r => r.groupId).filter((g): g is string => !!g);
      // A csoport MINDEN sora kell, a listában lévők is: adminként mindkét fél
      // itt van, és korábban épp ezeket zártuk ki — így sosem lett párja.
      const others = groups.length
        ? await ctx.db.booking.findMany({
            where:  { groupId: { in: groups } },
            select: { id: true, groupId: true, service: true, startsAt: true, status: true, worker: { select: { name: true } } },
          })
        : [];

      return rows.map(r => {
        const other = r.groupId
          ? others.find(o => o.groupId === r.groupId && o.id !== r.id)
          : undefined;
        return {
          ...r,
          pair: other
            ? {
                service:    other.service,
                workerName: other.worker.name ?? "",
                startsAt:   other.startsAt,
                status:     other.status,
              }
            : null,
        };
      });
    }),

  /**
   * Elfogadás. Ekkor keletkezik a vendég és az előjegyzés — addig a kérés
   * nem szennyezi a receptkönyvet.
   */
  accept: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.db.booking.findUnique({
        where:   { id: input.id },
        include: { worker: { select: { id: true, name: true } } },
      });
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen kérés." });
      assertOwn(ctx.session.user.role, ctx.session.user.id, b.workerId);
      if (b.status !== PENDING)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ezt a kérést már elbírálták." });

      // Vendég: a meglévőt keressük meg név szerint, hogy ne szaporodjanak.
      const name  = b.name.trim();
      const existing = await ctx.db.guest.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      const guest = existing
        // A meglévő kártyán a most megadott elérhetőség a frissebb, de csak
        // akkor írjuk felül, ha eddig nem volt — a szalon által beírt adatot
        // egy online űrlap ne tüntesse el.
        ? await ctx.db.guest.update({
            where: { id: existing.id },
            data: {
              phone: existing.phone ?? b.phone,
              email: existing.email ?? b.email,
            },
          })
        : await ctx.db.guest.create({ data: { name, phone: b.phone, email: b.email } });

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

      // Párban kért látogatás: a vendég egyetlen visszaigazolást kapjon, és
      // csak akkor, ha mindkét kolléga elfogadta. Félkész alkalomról értesíteni
      // rosszabb a hallgatásnál: nem tudná, mire számítson.
      const siblings = b.groupId
        ? await ctx.db.booking.findMany({
            where:  { groupId: b.groupId, id: { not: b.id } },
            select: { service: true, startsAt: true, status: true, worker: { select: { name: true } } },
          })
        : [];
      const waiting = siblings.some(x => x.status === PENDING || x.status === "megerosites_varo");
      const other   = siblings.find(x => x.status === "elfogadva");

      if (isConfigured() && !waiting) {
        const mail = confirmed({
          guestName: name, service: b.service,
          workerName: b.worker.name ?? "", start: b.startsAt,
          ...(other ? {
            also: { service: other.service, workerName: other.worker.name ?? "", start: other.startsAt },
          } : {}),
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
  decline: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.db.booking.findUnique({
        where:   { id: input.id },
        include: { worker: { select: { name: true } } },
      });
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen kérés." });
      assertOwn(ctx.session.user.role, ctx.session.user.id, b.workerId);
      if (b.status !== PENDING)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ezt a kérést már elbírálták." });

      await ctx.db.booking.update({ where: { id: b.id }, data: { status: "elutasitva" } });

      // Párban kért látogatásnál a másik fél döntése áll: csak ezt a részt
      // utasítottuk el, és a levélnek ezt kell megmondania.
      const sibling = b.groupId
        ? await ctx.db.booking.findFirst({
            where:  { groupId: b.groupId, id: { not: b.id }, status: { in: [PENDING, "elfogadva"] } },
            select: { service: true, worker: { select: { name: true } } },
          })
        : null;

      if (isConfigured()) {
        const extra = sibling
          ? `A látogatás másik része (${sibling.service}, ${sibling.worker.name ?? ""}) továbbra is él.`
          : undefined;
        const mail = declined({
          guestName: b.name, service: b.service,
          workerName: b.worker.name ?? "", start: b.startsAt,
        }, [input.reason, extra].filter(Boolean).join(" "));
        try { await send({ to: { email: b.email, name: b.name }, subject: mail.subject, html: mail.html }); }
        catch { /* az elutasítás akkor is megtörtént */ }
      }

      return { ok: true };
    }),

  /**
   * A foglalás korlátai: mennyivel előbb, és meddig előre lehet kérni.
   *
   * A "nyitva eddig" az, amivel havonta nyitjátok a következő hónapot: amíg
   * üres, a horizont dönt.
   */
  limits: protectedProcedure.query(async ({ ctx }) => {
    const s = await ctx.db.salonSetting.findUnique({ where: { id: "default" } });
    return {
      bookingOpenUntil:   s?.bookingOpenUntil ?? null,
      bookingLeadHours:   s?.bookingLeadHours ?? 12,
      bookingHorizonDays: s?.bookingHorizonDays ?? 60,
    };
  }),

  setLimits: protectedProcedure
    .input(z.object({
      // Üres string = nincs kézi nyitási dátum, a horizont dönt.
      bookingOpenUntil:   z.union([z.string(), z.null()]).optional(),
      bookingLeadHours:   z.number().int().min(0).max(24 * 14),
      bookingHorizonDays: z.number().int().min(1).max(365),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Csak admin állíthatja." });

      const until = input.bookingOpenUntil ? new Date(`${input.bookingOpenUntil}T23:59:00`) : null;
      if (until && isNaN(until.getTime()))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hibás dátum." });

      const data = {
        bookingOpenUntil:   until,
        bookingLeadHours:   input.bookingLeadHours,
        bookingHorizonDays: input.bookingHorizonDays,
      };
      return ctx.db.salonSetting.upsert({
        where:  { id: "default" },
        update: data,
        create: { id: "default", ...data },
      });
    }),
});
