import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { PrismaClient } from "../../../../generated/prisma";
import { activeProvider, isConfigured, providerFor } from "~/server/billing-provider";
import { BillingError, type Line, type PaymentMethod } from "~/server/billing-types";

/**
 * Bizonylatolás — nyugta alapból, számla ha a vendég kéri.
 *
 * A bizonylatot a Számlázz.hu állítja ki, ő végzi a NAV felé a 2026-09-01-től
 * kötelező nyugta-adatszolgáltatást is. Nálunk csak a bizonylatszám marad meg,
 * hogy a vendégkártyáról visszakereshető legyen.
 */

const PAYMENTS = ["készpénz", "bankkártya", "átutalás"] as const;

/**
 * A bizonylat forrása. Vendéges bejegyzésnél a vendégkártya (`cardId`), vendég
 * nélküli bejegyzésnél a tételek közvetlenül (`lines`) — a Pénzügyek oldalon
 * ilyen is rögzíthető.
 */
const SourceInput = z.object({
  cardId: z.string().optional(),
  lines:  z.array(z.object({ name: z.string().min(1), amount: z.number() })).optional(),
  label:  z.string().optional(),
});

const BuyerInput = z.object({
  name:    z.string().min(1, "A vevő neve kötelező."),
  zip:     z.string().min(1, "Az irányítószám kötelező."),
  city:    z.string().min(1, "A település kötelező."),
  address: z.string().min(1, "A cím kötelező."),
  email:   z.string().email().optional().or(z.literal("")),
});

/** A Számlázz.hu hibáit érthető üzenetként adjuk vissza, ne 500-as hibaként. */
function wrap(e: unknown): never {
  if (e instanceof BillingError)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: e.code ? `${e.message} (Számlázz.hu hibakód: ${e.code})` : e.message,
    });
  throw e;
}

export const billingRouter = createTRPCRouter({
  /** A UI ebből tudja, hogy a bizonylat-gombokat egyáltalán meg kell-e jeleníteni. */
  status: protectedProcedure.query(() => ({
    configured: isConfigured(),
    provider:   activeProvider().label,
  })),

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
    .input(SourceInput.extend({ payment: z.enum(PAYMENTS) }))
    .mutation(async ({ ctx, input }) => {
      const src      = await resolve(ctx.db, input);
      const provider = activeProvider();
      try {
        const doc = await provider.createReceipt({
          lines:    src.lines,
          payment:  input.payment,
          comment:  src.comment,
          orderRef: src.cardId ?? undefined,
        });
        return await save(ctx, {
          cardId:     src.cardId,
          kind:       "nyugta",
          number:     doc.number,
          externalId: doc.externalId,
          provider:   provider.name,
          total:      src.total,
          payment:    input.payment,
        });
      } catch (e) { wrap(e); }
    }),

  /**
   * Számla kiállítása — ha a vendég kéri. Ilyenkor a nevét és a címét is
   * rögzíteni kell, ezek nélkül a számla nem állítható ki.
   */
  issueInvoice: protectedProcedure
    .input(SourceInput.extend({ payment: z.enum(PAYMENTS), buyer: BuyerInput }))
    .mutation(async ({ ctx, input }) => {
      const src      = await resolve(ctx.db, input);
      const provider = activeProvider();
      const email    = input.buyer.email === "" ? undefined : input.buyer.email;
      try {
        const doc = await provider.createInvoice({
          lines:    src.lines,
          buyer:    { ...input.buyer, email },
          payment:  input.payment,
          date:     src.date,
          comment:  src.comment,
          orderRef: src.cardId ?? undefined,
        });
        return await save(ctx, {
          cardId:     src.cardId,
          kind:       "szamla",
          number:     doc.number,
          externalId: doc.externalId,
          provider:   provider.name,
          total:      src.total,
          payment:    input.payment,
          buyer:      { ...input.buyer, email },
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

      const provider = providerFor(receipt.provider);
      const ref      = { number: receipt.number, externalId: receipt.externalId };
      try {
        const doc = receipt.kind === "nyugta"
          ? await provider.stornoReceipt(ref)
          : await provider.stornoInvoice(ref, input.reason);
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
        const pdf = await providerFor(receipt.provider)
          .getReceiptPdf({ number: receipt.number, externalId: receipt.externalId });
        if (!pdf) throw new TRPCError({ code: "NOT_FOUND", message: "Nem jött vissza PDF." });
        return { number: receipt.number, pdf };
      } catch (e) { wrap(e); }
    }),
});

// ── segéd ─────────────────────────────────────────────────────────────────────

type Source = {
  cardId:  string | null;
  lines:   Line[];
  total:   number;
  date:    Date;
  comment: string;
};

/**
 * A bizonylat sorait vagy a vendégkártyából, vagy a kapott tételekből építi fel.
 *
 * Vendégkártyánál: minden szolgáltatás egy sor, minden felhasznált anyag egy sor,
 * és — ha volt — egy negatív kedvezmény-sor. A kedvezményt a kártya nem tárolja
 * külön, de kiszámolható: a tételek összege mínusz a ténylegesen fizetett összeg.
 * Így a sorok végösszege mindig megegyezik a kártya `total` értékével.
 */
async function resolve(
  db: PrismaClient,
  input: { cardId?: string; lines?: { name: string; amount: number }[]; label?: string },
): Promise<Source> {
  if (input.cardId) return cardSource(db, input.cardId);

  if (!input.lines?.length)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Nincs mit bizonylatolni." });

  const lines = input.lines.map(l => line(l.name, l.amount));
  const total = sum(lines);
  if (total <= 0)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Nulla összegről nem állítható ki bizonylat." });

  return { cardId: null, lines, total, date: new Date(), comment: input.label ?? "" };
}

async function cardSource(db: PrismaClient, cardId: string): Promise<Source> {
  const card = await db.guestCard.findUnique({
    where:   { id: cardId },
    include: { guest: true, services: true, materials: true },
  });
  if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Nincs ilyen vendégkártya." });
  if (card.total <= 0)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Nulla összegű kártyáról nem állítható ki bizonylat." });

  const lines: Line[] = [
    ...card.services.map(s => line(s.name, s.price)),
    ...card.materials.map(m => line(`${m.name}${m.grams ? ` (${m.grams} g)` : ""}`, m.lineTotal)),
  ];

  const discount = Math.round(sum(lines) - card.total);
  if (discount > 0) lines.push(line("Kedvezmény", -discount));

  return {
    cardId:  card.id,
    lines,
    total:   card.total,
    date:    card.date,
    comment: `${card.guest.name} — ${card.date.toISOString().slice(0, 10)}`,
  };
}

/** Alanyi adómentesnél a nettó és a bruttó azonos, ezért elég egy összeg. */
function line(name: string, amount: number): Line {
  return { name, qty: 1, unit: "db", net: amount, gross: amount };
}

function sum(lines: Line[]): number {
  return lines.reduce((a, l) => a + l.gross, 0);
}

type SaveCtx = {
  db: PrismaClient;
  session: { user: { id: string; name?: string | null } };
};

async function save(ctx: SaveCtx, r: {
  cardId:     string | null;
  kind:       "nyugta" | "szamla";
  number:     string;
  externalId: string | null;
  provider:   string;
  total:      number;
  payment:    PaymentMethod;
  buyer?:     { name: string; zip: string; city: string; address: string; email?: string };
}) {
  return ctx.db.receipt.create({
    data: {
      cardId:        r.cardId ?? null,
      kind:          r.kind,
      number:        r.number,
      externalId:    r.externalId,
      provider:      r.provider,
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
