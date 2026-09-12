import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { PrismaClient } from "../../../../generated/prisma";
import {
  createInvoice,
  createReceipt,
  getReceiptPdf,
  isConfigured,
  stornoInvoice,
  stornoReceipt,
  SzamlazzError,
  type Line,
  type PaymentMethod,
} from "~/server/szamlazz";

/**
 * Bizonylatolás — nyugta alapból, számla ha a vendég kéri.
 *
 * A bizonylatot a Számlázz.hu állítja ki, ő végzi a NAV felé a 2026-09-01-től
 * kötelező nyugta-adatszolgáltatást is. Nálunk csak a bizonylatszám marad meg,
 * hogy a vendégkártyáról visszakereshető legyen.
 */

const PAYMENTS = ["készpénz", "bankkártya", "átutalás"] as const;

const BuyerInput = z.object({
  name:    z.string().min(1, "A vevő neve kötelező."),
  zip:     z.string().min(1, "Az irányítószám kötelező."),
  city:    z.string().min(1, "A település kötelező."),
  address: z.string().min(1, "A cím kötelező."),
  email:   z.string().email().optional().or(z.literal("")),
});

/** A Számlázz.hu hibáit érthető üzenetként adjuk vissza, ne 500-as hibaként. */
function wrap(e: unknown): never {
  if (e instanceof SzamlazzError)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: e.code ? `${e.message} (Számlázz.hu hibakód: ${e.code})` : e.message,
    });
  throw e;
}

export const billingRouter = createTRPCRouter({
  /** A UI ebből tudja, hogy a bizonylat-gombokat egyáltalán meg kell-e jeleníteni. */
  status: protectedProcedure.query(() => ({ configured: isConfigured() })),

  /** Egy vendégkártya bizonylatai (nyugta, számla, sztornózott is). */
  forCard: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.receipt.findMany({
        where:   { cardId: input.cardId },
        orderBy: { issuedAt: "desc" },
      })
    ),

  /** A legutóbbi bizonylatok — az adminban, ellenőrzéshez. */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }).default({ limit: 100 }))
    .query(({ ctx, input }) =>
      ctx.db.receipt.findMany({ orderBy: { issuedAt: "desc" }, take: input.limit })
    ),

  /**
   * Nyugta kiállítása egy vendégkártyáról. Ez az alapeset: a vendég nyugtát kap,
   * és a NAV-adatszolgáltatás ezzel megtörtént.
   */
  issueReceipt: protectedProcedure
    .input(z.object({
      cardId:  z.string(),
      payment: z.enum(PAYMENTS),
    }))
    .mutation(async ({ ctx, input }) => {
      const { card, lines } = await cardLines(ctx.db, input.cardId);
      try {
        const doc = await createReceipt({
          lines,
          payment:  input.payment,
          comment:  `${card.guest.name} — ${card.date.toISOString().slice(0, 10)}`,
          orderRef: card.id,
        });
        return await save(ctx, {
          cardId:  card.id,
          kind:    "nyugta",
          number:  doc.number,
          total:   card.total,
          payment: input.payment,
        });
      } catch (e) { wrap(e); }
    }),

  /**
   * Számla kiállítása — ha a vendég kéri. Ilyenkor a nevét és a címét is
   * rögzíteni kell, ezek nélkül a számla nem állítható ki.
   */
  issueInvoice: protectedProcedure
    .input(z.object({
      cardId:  z.string(),
      payment: z.enum(PAYMENTS),
      buyer:   BuyerInput,
    }))
    .mutation(async ({ ctx, input }) => {
      const { card, lines } = await cardLines(ctx.db, input.cardId);
      const email = input.buyer.email === "" ? undefined : input.buyer.email;
      try {
        const doc = await createInvoice({
          lines,
          buyer:    { ...input.buyer, email },
          payment:  input.payment,
          date:     card.date,
          comment:  `${card.guest.name} — ${card.date.toISOString().slice(0, 10)}`,
          orderRef: card.id,
        });
        return await save(ctx, {
          cardId:  card.id,
          kind:    "szamla",
          number:  doc.number,
          total:   card.total,
          payment: input.payment,
          buyer:   { ...input.buyer, email },
        });
      } catch (e) { wrap(e); }
    }),

  /** Bizonylat sztornózása — a rossz bizonylatot nem törölni, hanem sztornózni kell. */
  storno: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await ctx.db.receipt.findUnique({ where: { id: input.id } });
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen bizonylat." });
      if (receipt.stornoedAt)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ez a bizonylat már sztornózva van." });

      try {
        const doc = receipt.kind === "nyugta"
          ? await stornoReceipt(receipt.number)
          : await stornoInvoice(receipt.number, input.reason);
        return await ctx.db.receipt.update({
          where: { id: receipt.id },
          data:  { stornoNumber: doc.number, stornoedAt: new Date() },
        });
      } catch (e) { wrap(e); }
    }),

  /** Egy nyugta PDF-je base64-ben — a bizonylatot nem tároljuk, onnan kérjük le. */
  pdf: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await ctx.db.receipt.findUnique({ where: { id: input.id } });
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen bizonylat." });
      if (receipt.kind !== "nyugta")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A számla PDF-je a Számlázz.hu fiókban érhető el.",
        });
      try {
        const pdf = await getReceiptPdf(receipt.number);
        if (!pdf) throw new TRPCError({ code: "NOT_FOUND", message: "Nem jött vissza PDF." });
        return { number: receipt.number, pdf };
      } catch (e) { wrap(e); }
    }),
});

// ── segéd ─────────────────────────────────────────────────────────────────────

/**
 * A vendégkártyából bizonylat-sorokat épít: szolgáltatások, felhasznált anyagok,
 * és — ha volt — egy negatív kedvezmény-sor. A kedvezményt a kártya nem tárolja
 * külön, de kiszámolható: a tételek összege mínusz a ténylegesen fizetett összeg.
 * A sorok végösszegének egyeznie kell a kártya `total` értékével.
 */
async function cardLines(db: PrismaClient, cardId: string) {
  const card = await db.guestCard.findUnique({
    where:   { id: cardId },
    include: { guest: true, services: true, materials: true },
  });
  if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen vendégkártya." });
  if (card.total <= 0)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Nulla összegű kártyáról nem állítható ki bizonylat." });

  const lines: Line[] = [];
  for (const s of card.services)
    lines.push({ name: s.name, qty: 1, unit: "db", net: s.price, gross: s.price });
  for (const m of card.materials)
    lines.push({
      name:  `${m.name}${m.grams ? ` (${m.grams} g)` : ""}`,
      qty:   1,
      unit:  "db",
      net:   m.lineTotal,
      gross: m.lineTotal,
    });

  const sum      = lines.reduce((a, l) => a + l.gross, 0);
  const discount = Math.round(sum - card.total);
  if (discount > 0)
    lines.push({ name: "Kedvezmény", qty: 1, unit: "db", net: -discount, gross: -discount });

  return { card, lines };
}

type SaveCtx = {
  db: PrismaClient;
  session: { user: { id: string; name?: string | null } };
};

async function save(ctx: SaveCtx, r: {
  cardId:  string;
  kind:    "nyugta" | "szamla";
  number:  string;
  total:   number;
  payment: PaymentMethod;
  buyer?:  { name: string; zip: string; city: string; address: string; email?: string };
}) {
  return ctx.db.receipt.create({
    data: {
      cardId:        r.cardId,
      kind:          r.kind,
      number:        r.number,
      total:         r.total,
      paymentMethod: r.payment,
      buyerName:     r.buyer?.name    ?? null,
      buyerZip:      r.buyer?.zip     ?? null,
      buyerCity:     r.buyer?.city    ?? null,
      buyerAddress:  r.buyer?.address ?? null,
      buyerEmail:    r.buyer?.email   ?? null,
      issuedById:    ctx.session.user.id,
      issuedByName:  ctx.session.user.name ?? null,
    },
  });
}
