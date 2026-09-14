import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { isConfigured, listEvents, type CalendarEvent } from "~/server/google";
import { AUTO_MATCH, nameScore } from "~/server/guest-match";

/**
 * Google Naptár — dolgozónkénti összekötés.
 *
 * Az admin mindenki időpontjait látja (a naptár amúgy is az egész szalonról szól),
 * a dolgozó csak a sajátját. Egy dolgozó naptárának hibája nem viheti el az egész
 * nézetet, ezért fiókonként külön kezeljük a hibát.
 */

export type EventWithOwner = CalendarEvent & {
  userId:   string;
  userName: string;
  cardId:   string | null;   // ha már készült belőle vendégkártya
};

export const gcalRouter = createTRPCRouter({
  /** A UI ebből tudja, megjelenítse-e egyáltalán a Google-részt. */
  status: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.user.findUnique({
      where:  { id: ctx.session.user.id },
      select: { googleEmail: true, googleRefreshToken: true, googleConnectedAt: true },
    });
    return {
      configured:  isConfigured(),
      connected:   Boolean(me?.googleRefreshToken),
      email:       me?.googleEmail ?? null,
      connectedAt: me?.googleConnectedAt ?? null,
    };
  }),

  /** Ki van összekötve a szalonban — az adminnak, hogy lássa a lefedettséget. */
  connections: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const users = await ctx.db.user.findMany({
      where:   { active: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, googleEmail: true, googleConnectedAt: true, googleRefreshToken: true },
    });
    return users.map(u => ({
      id: u.id, name: u.name, email: u.googleEmail,
      connectedAt: u.googleConnectedAt, connected: Boolean(u.googleRefreshToken),
    }));
  }),

  /** Az összekötés bontása. A Google oldalán a hozzáférés a fiók beállításaiban vonható vissza. */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data:  { googleRefreshToken: null, googleEmail: null, googleConnectedAt: null },
    });
    return { ok: true };
  }),

  /**
   * Vendégkártya nyitása egy naptári időpontból: a vendéget az esemény címe
   * alapján megkeressük (vagy létrehozzuk), és egy üres kártyát nyitunk rá,
   * amit utána a megszokott szerkesztőben lehet kitölteni.
   */
  cardFromEvent: protectedProcedure
    .input(z.object({
      eventId:  z.string(),
      title:    z.string().min(1),
      date:     z.string(),   // "YYYY-MM-DD"
      workerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.guestCard.findUnique({ where: { googleEventId: input.eventId } });
      if (existing) return { cardId: existing.id, created: false, matched: true, guestName: null };

      // Staff csak a saját nevére nyithat kártyát. Adminnál a kapott dolgozót
      // ellenőrizzük is: érvénytelen azonosítóval a létrehozás idegenkulcs-hibával
      // szállna el, ami a felületen értelmezhetetlen hibaüzenet lenne.
      let workerId = ctx.session.user.id;
      if (ctx.session.user.role === "admin" && input.workerId) {
        const worker = await ctx.db.user.findUnique({
          where:  { id: input.workerId },
          select: { id: true },
        });
        if (worker) workerId = worker.id;
      }

      // Az esemény címe ritkán pont a vendég neve ("Kovács Anna 14:00 festés"),
      // ezért nem szó szerint keresünk. Új vendéget csak akkor hozunk létre, ha
      // biztosan nincs találat — egy téves párosítás rosszabb, mint egy duplikátum.
      const name    = input.title.trim();
      const guests  = await ctx.db.guest.findMany({ select: { id: true, name: true } });
      const scored  = guests
        .map(g => ({ g, score: nameScore(name, g.name) }))
        .sort((a, b) => b.score - a.score);
      const top = scored[0];

      const guest = top && top.score >= AUTO_MATCH
        ? top.g
        : await ctx.db.guest.create({ data: { name } });
      const matched = Boolean(top && top.score >= AUTO_MATCH);

      const card = await ctx.db.guestCard.create({
        data: {
          guestId:       guest.id,
          workerId,
          date:          new Date(input.date),
          total:         0,
          googleEventId: input.eventId,
        },
      });
      return { cardId: card.id, created: true, matched, guestName: guest.name };
    }),

  /** Egy időszak időpontjai a naptárból. */
  events: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }): Promise<EventWithOwner[]> => {
      if (!isConfigured()) return [];

      const isAdmin = ctx.session.user.role === "admin";
      const users = await ctx.db.user.findMany({
        where: {
          active:             true,
          googleRefreshToken: { not: null },
          ...(isAdmin ? {} : { id: ctx.session.user.id }),
        },
        select: { id: true, name: true, googleRefreshToken: true, googleCalendarId: true },
      });
      if (users.length === 0) return [];

      const from = new Date(input.from);
      const to   = new Date(input.to);

      const perUser = await Promise.all(users.map(async u => {
        try {
          const events = await listEvents(u, from, to);
          return events.map(e => ({ ...e, userId: u.id, userName: u.name ?? "?" }));
        } catch {
          // Lejárt vagy visszavont hozzáférés — a többi dolgozó naptára menjen tovább.
          return [];
        }
      }));

      const flat = perUser.flat();
      if (flat.length === 0) return [];

      const ids = flat.map(e => e.id);

      // A Spellbookban rögzített előjegyzés kimegy a Google-be, és onnan vissza is
      // jönne — azt a saját, gazdagabb adatunkból jelenítjük meg, ezért itt kiesik.
      const own = await ctx.db.appointment.findMany({
        where:  { googleEventId: { in: ids } },
        select: { googleEventId: true },
      });
      const ownIds = new Set(own.map(a => a.googleEventId));

      // Melyik időpontból készült már vendégkártya — hogy ne lehessen kétszer.
      const cards = await ctx.db.guestCard.findMany({
        where:  { googleEventId: { in: ids } },
        select: { id: true, googleEventId: true },
      });
      const byEvent = new Map(cards.map(c => [c.googleEventId, c.id]));

      return flat
        .filter(e => !ownIds.has(e.id))
        .map(e => ({ ...e, cardId: byEvent.get(e.id) ?? null }));
    }),
});
