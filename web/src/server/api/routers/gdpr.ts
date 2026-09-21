import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, salonProcedure } from "~/server/api/trpc";
import type { PrismaClient } from "../../../../generated/prisma";

/**
 * GDPR érintetti jogok és megőrzési idő.
 *
 * Jogalapok, amikre ez a modul épül:
 *  - Vendégadatok (név, telefon, receptek): szerződés teljesítése — 6. cikk (1) b).
 *  - Jegyzetben szereplő egészségi információ (allergia, érzékeny fejbőr):
 *    különleges adat, kifejezett hozzájárulás kell — 9. cikk (2) a).
 *    Ezt a Guest.consentAt rögzíti.
 *  - Megőrzés: az utolsó látogatástól számított RETENTION_YEARS év — 5. cikk (1) e).
 */

export const RETENTION_YEARS = 3;

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

/** A megőrzési határ: az ennél régebbi utolsó látogatás már törlendő. */
function retentionCutoff(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - RETENTION_YEARS);
  return d;
}

export type LogInput = {
  action: "export" | "delete" | "retention" | "consent";
  subject: string;
  subjectId?: string | null;
  detail?: string | null;
};

export const gdprRouter = createTRPCRouter({
  /**
   * 15. és 20. cikk — hozzáférés és adathordozhatóság.
   * Egyetlen vendég összes tárolt adata géppel olvasható (JSON) formában.
   */
  exportGuest: salonProcedure
    .input(z.object({ guestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const guest = await ctx.db.guest.findUnique({
        where: { id: input.guestId },
        include: {
          cards: {
            orderBy: { date: "asc" },
            include: {
              worker:    { select: { name: true } },
              services:  { select: { name: true, price: true, duration: true, categoryName: true } },
              materials: { select: { name: true, brand: true, colorCode: true, grams: true, lineTotal: true } },
            },
          },
        },
      });
      if (!guest) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen vendég." });

      await log(ctx, {
        action: "export",
        subject: guest.name,
        subjectId: guest.id,
        detail: `${guest.cards.length} kártya`,
      });

      return {
        exportaltAdatok: {
          keszult: new Date().toISOString(),
          adatkezelo: process.env.GDPR_CONTROLLER_NAME ?? "Salon Spellbook",
          tajekoztato: "/adatkezeles",
        },
        vendeg: {
          nev:        guest.name,
          telefon:    guest.phone,
          jegyzet:    guest.notes,
          rogzitve:   guest.createdAt.toISOString(),
          hozzajarulas: guest.consentAt
            ? { datum: guest.consentAt.toISOString(), mod: guest.consentSource }
            : null,
        },
        latogatasok: guest.cards.map((c) => ({
          datum:     c.date.toISOString().slice(0, 10),
          fodrasz:   c.worker.name,
          osszeg:    c.total,
          jegyzet:   c.notes,
          szolgaltatasok: c.services.map((s) => ({
            nev: s.name, ar: s.price, perc: s.duration, kategoria: s.categoryName,
          })),
          szinrecept: c.materials.map((m) => ({
            anyag: m.name, marka: m.brand, szinkod: m.colorCode, gramm: m.grams, ar: m.lineTotal,
          })),
        })),
      };
    }),

  /** 7. cikk — a hozzájárulás megadásának/visszavonásának rögzítése. */
  setConsent: salonProcedure
    .input(z.object({
      guestId: z.string(),
      granted: z.boolean(),
      source:  z.enum(["szóban", "papíron", "online"]).default("szóban"),
    }))
    .mutation(async ({ ctx, input }) => {
      const guest = await ctx.db.guest.update({
        where: { id: input.guestId },
        data: input.granted
          ? { consentAt: new Date(), consentSource: input.source }
          : { consentAt: null, consentSource: null },
        select: { id: true, name: true, consentAt: true, consentSource: true },
      });

      await log(ctx, {
        action: "consent",
        subject: guest.name,
        subjectId: guest.id,
        detail: input.granted ? `megadva (${input.source})` : "visszavonva",
      });

      return guest;
    }),

  /**
   * 5. cikk (1) e) — megőrzési idő.
   * Kilistázza, kit érintene a takarítás. Semmit nem módosít.
   */
  retentionPreview: salonProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);
    const cutoff = retentionCutoff();

    const guests = await ctx.db.guest.findMany({
      include: {
        cards:  { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { name: "asc" },
    });

    const stale = guests
      .map((g) => ({
        id:        g.id,
        name:      g.name,
        cards:     g._count.cards,
        lastVisit: g.cards[0]?.date ?? null,
        // Aki sosem járt nálunk: a rögzítés dátuma számít.
        reference: g.cards[0]?.date ?? g.createdAt,
      }))
      .filter((g) => g.reference < cutoff);

    return {
      cutoff,
      retentionYears: RETENTION_YEARS,
      total:    guests.length,
      affected: stale,
    };
  }),

  /**
   * A megőrzési idő letelte utáni tényleges törlés.
   * Ugyanaz a hatás, mint az érintetti törlésnél: a bevétel név nélkül marad meg.
   */
  runRetention: salonProcedure
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      requireAdmin(ctx.session.user.role);
      const cutoff = retentionCutoff();

      const guests = await ctx.db.guest.findMany({
        include: {
          cards:  { orderBy: { date: "desc" }, take: 1, select: { date: true } },
          _count: { select: { cards: true } },
        },
      });

      const stale = guests.filter(
        (g) => (g.cards[0]?.date ?? g.createdAt) < cutoff,
      );
      if (stale.length === 0) return { deleted: 0, names: [] as string[] };

      await ctx.db.guest.deleteMany({ where: { id: { in: stale.map((g) => g.id) } } });

      await ctx.db.gdprLog.createMany({
        data: stale.map((g) => ({
          action:     "retention",
          subject:    g.name,
          subjectId:  g.id,
          detail:     `${RETENTION_YEARS} év inaktivitás · ${g._count.cards} kártya`,
          actorId:    ctx.session.user.id,
          actorEmail: ctx.session.user.email ?? null,
        })),
      });

      return { deleted: stale.length, names: stale.map((g) => g.name) };
    }),

  /** Az elszámoltathatósági napló — ellenőrzésnél ezt kell tudni megmutatni. */
  logs: salonProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }).default({ limit: 100 }))
    .query(({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      return ctx.db.gdprLog.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),
});

// ── segéd ─────────────────────────────────────────────────────────────────────

export type LogCtx = {
  db: PrismaClient;
  session: { user: { id: string; email?: string | null } };
};

export async function log(ctx: LogCtx, entry: LogInput) {
  await ctx.db.gdprLog.create({
    data: {
      action:     entry.action,
      subject:    entry.subject,
      subjectId:  entry.subjectId ?? null,
      detail:     entry.detail ?? null,
      actorId:    ctx.session.user.id,
      actorEmail: ctx.session.user.email ?? null,
    },
  });
}
