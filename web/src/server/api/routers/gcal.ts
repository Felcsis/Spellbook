import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { isConfigured, listCalendars, listEvents, type CalendarEvent } from "~/server/google";
import { AUTO_MATCH, SUGGEST_MIN, cleanGuestName, fold, matchServices, nameScore } from "~/server/guest-match";

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

  /**
   * A bejelentkezett dolgozó naptárai. Aki nem az alapértelmezettbe veszi fel az
   * időpontjait, itt tudja kiválasztani a sajátját.
   */
  calendars: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.user.findUnique({
      where:  { id: ctx.session.user.id },
      select: { id: true, googleRefreshToken: true, googleCalendarId: true },
    });
    if (!me?.googleRefreshToken) return { calendars: [], selected: null, error: null };
    try {
      return { calendars: await listCalendars(me), selected: me.googleCalendarId, error: null };
    } catch (e) {
      // Régi összekötésnél még nincs meg a listázási jog — ezt meg kell mondani.
      return {
        calendars: [], selected: me.googleCalendarId,
        error: e instanceof Error ? e.message : "Nem sikerült lekérni a naptárakat.",
      };
    }
  }),

  /** Melyik naptárat szinkronizáljuk. Üres = az alapértelmezett. */
  setCalendar: protectedProcedure
    .input(z.object({ calendarId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data:  { googleCalendarId: input.calendarId },
      });
      return { ok: true };
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
      if (existing) return { cardId: existing.id, created: false, matched: true, guestName: null, addedServices: [], chooseFrom: [] };

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
      // A párosítás a teljes címmel dolgozik (a zajt maga szűri), az ÚJ vendég
      // viszont a megtisztított nevet kapja — különben a szolgáltatás is a nevébe
      // kerülne ("Bence modell festés , barna és szőke tincs").
      const title   = input.title.trim();
      const guests  = await ctx.db.guest.findMany({ select: { id: true, name: true } });
      const scored  = guests
        .map(g => ({ g, score: nameScore(title, g.name) }))
        .sort((a, b) => b.score - a.score);
      const top = scored[0];

      const guest = top && top.score >= AUTO_MATCH
        ? top.g
        : await ctx.db.guest.create({ data: { name: cleanGuestName(title) } });
      const matched = Boolean(top && top.score >= AUTO_MATCH);

      // A naptárcím a szolgáltatást is elárulja ("Aliz hosszú hajvágás").
      // Az egyértelműt beírjuk; a kétértelműt (pl. "Hosszú" a női és a férfi
      // listán is szerepel, eltérő áron) csak felajánljuk — ott az ár is téved.
      const worker = await ctx.db.user.findUnique({
        where: { id: workerId }, select: { priceListType: true },
      });
      const categories = await ctx.db.serviceCategory.findMany({
        where:   { priceListType: worker?.priceListType ?? "master" },
        include: { services: { where: { active: true } } },
      });
      const catalog = categories.flatMap(c =>
        c.services.map(sv => ({
          id: sv.id, name: sv.name, category: c.name, price: sv.price, duration: sv.duration,
        })),
      );
      // A vendég szokása oldja fel a kétértelműséget: ha eddig mindig férfi
      // hajvágást kért, nála a "rövid" is az. (A keresztnévből NEM tippelünk —
      // a szalonban több női nevű vendég is férfi hajvágást kér.)
      const past = await ctx.db.guestCardService.findMany({
        where:  { card: { guestId: guest.id }, categoryName: { not: null } },
        select: { categoryName: true },
      });
      const freq = new Map<string, number>();
      for (const p of past)
        if (p.categoryName) freq.set(p.categoryName, (freq.get(p.categoryName) ?? 0) + 1);
      const preferred = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);

      const svc = matchServices(title, catalog, preferred);

      const card = await ctx.db.guestCard.create({
        data: {
          guestId:       guest.id,
          workerId,
          date:          new Date(input.date),
          total:         svc.matched.reduce((sum, m) => sum + m.price, 0),
          googleEventId: input.eventId,
          services: {
            create: svc.matched.map(m => ({
              name:         m.name,
              price:        m.price,
              duration:     m.duration,
              categoryName: m.category,
            })),
          },
        },
      });

      return {
        cardId: card.id, created: true, matched, guestName: guest.name,
        addedServices: svc.matched.map(m => m.name),
        chooseFrom:    svc.ambiguous.map(m => ({ name: m.name, category: m.category, price: m.price })),
      };
    }),

  /** Amit "nem vendég"-ként jelöltek meg. */
  ignoredTitles: protectedProcedure.query(({ ctx }) =>
    ctx.db.ignoredEventTitle.findMany({
      orderBy: { pattern: "asc" },
      include: { worker: { select: { name: true } } },
    })
  ),

  /**
   * Egy naptárcím megjelölése: ez nem vendég.
   *
   * A teljes cím sosem egyezne pontosan ("Bora" vs "Bora 9-17"), ezért az első
   * két szót vesszük mintának, és részletre illesztünk.
   */
  ignoreTitle: protectedProcedure
    .input(z.object({ title: z.string().min(1), workerId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const pattern  = input.title.trim().split(/\s+/).slice(0, 2).join(" ");
      const workerId = ctx.session.user.role === "admin"
        ? (input.workerId ?? null)
        : ctx.session.user.id;

      const existing = await ctx.db.ignoredEventTitle.findFirst({ where: { pattern, workerId } });
      return existing ?? ctx.db.ignoredEventTitle.create({ data: { pattern, workerId } });
    }),

  unignoreTitle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ignoredEventTitle.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /**
   * Korábbi naptári időpontok, amikhez még nem készült bejegyzés.
   *
   * A párosítás NÉV szerint megy, nem a Google-esemény azonosítója alapján: a
   * kártya csak akkor hordozza az azonosítót, ha a naptárból indították, a
   * Pénzügyeknél rögzített bejegyzés nem. Azonosító alapján minden kézzel
   * felvitt vendég hiányzónak látszana.
   */
  unbilled: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(30).default(7) }).default({ days: 7 }))
    .query(async ({ ctx, input }) => {
      if (!isConfigured()) return [];

      const isAdmin = ctx.session.user.role === "admin";
      const users = await ctx.db.user.findMany({
        where: {
          active: true, googleRefreshToken: { not: null },
          ...(isAdmin ? {} : { id: ctx.session.user.id }),
        },
        select: { id: true, name: true, googleRefreshToken: true, googleCalendarId: true },
      });
      if (!users.length) return [];

      // Csak a lezárt napok érdekesek: a mai nap még alakul.
      const to = new Date(); to.setHours(0, 0, 0, 0);
      const from = new Date(to); from.setDate(from.getDate() - input.days);

      const cards = await ctx.db.guestCard.findMany({
        where:   { date: { gte: from, lt: to } },
        include: { guest: { select: { name: true } } },
      });

      // Ami nem vendég: másik munkahely, saját elfoglaltság. Enélkül a másik
      // munkahely minden napja hiányzó bejegyzésnek látszana.
      const ignored = await ctx.db.ignoredEventTitle.findMany({
        select: { pattern: true, workerId: true },
      });
      const isIgnored = (title: string, workerId: string) => {
        const t = fold(title);
        return ignored.some(i =>
          (i.workerId === null || i.workerId === workerId) && t.includes(fold(i.pattern)));
      };

      const out: { date: string; title: string; userId: string; userName: string }[] = [];

      for (const u of users) {
        let events;
        try { events = await listEvents(u, from, to); } catch { continue; }

        for (const e of events) {
          const day = e.start.slice(0, 10);
          const sameDay = cards.filter(c => {
            const d = new Date(c.date);
            const ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
            return ds === day && c.workerId === u.id;
          });
          if (isIgnored(e.title, u.id)) continue;
          const covered = sameDay.some(c => nameScore(e.title, c.guest.name) >= SUGGEST_MIN);
          if (!covered) out.push({ date: day, title: e.title, userId: u.id, userName: u.name ?? "?" });
        }
      }

      return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    }),

  /** Egy időszak időpontjai a naptárból. */
  events: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }): Promise<{ events: EventWithOwner[]; failed: string[] }> => {
      if (!isConfigured()) return { events: [], failed: [] };

      const isAdmin = ctx.session.user.role === "admin";
      const users = await ctx.db.user.findMany({
        where: {
          active:             true,
          googleRefreshToken: { not: null },
          ...(isAdmin ? {} : { id: ctx.session.user.id }),
        },
        select: { id: true, name: true, googleRefreshToken: true, googleCalendarId: true },
      });
      if (users.length === 0) return { events: [], failed: [] };

      const from = new Date(input.from);
      const to   = new Date(input.to);

      // Egy dolgozó hibája ne vigye el a többi naptárát — de ne is tűnjön el
      // némán: a lejárt hozzáférés így hetekig észrevétlen maradna.
      const failed: string[] = [];
      const perUser = await Promise.all(users.map(async u => {
        try {
          const events = await listEvents(u, from, to);
          return events.map(e => ({ ...e, userId: u.id, userName: u.name ?? "?" }));
        } catch {
          failed.push(u.name ?? "?");
          return [];
        }
      }));

      const flat = perUser.flat();
      if (flat.length === 0) return { events: [], failed };

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

      return {
        events: flat
          .filter(e => !ownIds.has(e.id))
          .map(e => ({ ...e, cardId: byEvent.get(e.id) ?? null })),
        failed,
      };
    }),
});
