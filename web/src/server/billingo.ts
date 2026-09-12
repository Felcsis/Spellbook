/**
 * Billingo API v3 — nyugta és számla kiállítása.
 *
 * REST + JSON, `X-API-KEY` fejléccel. A Billingo is elvégzi a NAV felé a
 * nyugta-adatszolgáltatást, ha a fiók össze van kötve a NAV-val.
 *
 * Két Billingo-sajátosság, amit a Számlázz.hu-nál nem kellett kezelni:
 *  - A bizonylat "tömbjét" (block) numerikus azonosító jelöli, nem szöveges
 *    előtag. Ezt nem kérjük a felhasználótól: a fiókból kiolvassuk.
 *  - A számlához KÖTELEZŐ egy partner (vevő) rekord, ezért a vevőt előbb
 *    létrehozzuk vagy megkeressük.
 */

import { env } from "~/env";
import {
  BillingError,
  type BillingProvider,
  type Buyer,
  type DocRef,
  type IssuedDoc,
  type Line,
  type PaymentMethod,
} from "~/server/billing-types";

const BASE = "https://api.billingo.hu/v3";

/** A magyar fizetési módok Billingo-kódjai. */
const PAYMENT: Record<PaymentMethod, string> = {
  "készpénz":    "cash",
  "bankkártya":  "bankcard",
  "átutalás":    "wire_transfer",
};

function apiKey(): string {
  const key = env.BILLINGO_API_KEY?.trim();
  if (!key)
    throw new BillingError("Nincs beállítva a Billingo API kulcs (BILLINGO_API_KEY).");
  return key;
}

function vatKey(): string {
  return env.BILLING_VAT_KEY?.trim() ?? "AAM";
}

async function call<T>(path: string, init?: RequestInit & { raw?: boolean }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-KEY":    apiKey(),
      "Content-Type": "application/json",
      Accept:         init?.raw ? "application/pdf" : "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    // A Billingo JSON-ban küldi a hibát; ha mégsem, a nyers szöveg is többet mond a semminél.
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { message?: string; errors?: Record<string, string[]> };
      const fields = body.errors
        ? Object.entries(body.errors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      detail = [body.message, fields].filter(Boolean).join(" — ") || detail;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) detail = text.slice(0, 300);
    }
    throw new BillingError(`Billingo hiba: ${detail}`, String(res.status));
  }

  if (init?.raw) {
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64") as unknown as T;
  }
  return await res.json() as T;
}

// ── bizonylattömbök ───────────────────────────────────────────────────────────

type Block = { id: number; name: string; prefix: string; type: string };

/**
 * A tömbök a fiók élettartama alatt nem változnak, ezért egyszer kérjük le.
 * Az üres cache miatti extra hívás ára elenyésző a bizonylat-kiállításhoz képest.
 */
let blockCache: Block[] | null = null;

async function blocks(): Promise<Block[]> {
  blockCache ??= (await call<{ data: Block[] }>("/document-blocks?per_page=100")).data;
  return blockCache;
}

/**
 * A megfelelő tömb azonosítója. A típus szerint keresünk, mert a nyugtának és a
 * számlának külön tömbje van — ugyanaz a csapda, mint a Számlázz.hu előtagjainál.
 */
async function blockId(kind: "receipt" | "invoice"): Promise<number> {
  const override = kind === "receipt" ? env.BILLINGO_BLOCK_RECEIPT : env.BILLINGO_BLOCK_INVOICE;
  if (override?.trim()) return Number(override.trim());

  const all   = await blocks();
  const match = all.find(b => b.type === kind) ?? all.find(b => b.type === "all");
  if (!match)
    throw new BillingError(
      `Nincs ${kind === "receipt" ? "nyugta" : "számla"} bizonylattömb a Billingo fiókban. ` +
      "Hozz létre egyet a Billingóban, vagy add meg a tömb azonosítóját a beállításokban."
    );
  return match.id;
}

// ── partner (vevő) ────────────────────────────────────────────────────────────

type Partner = { id: number; name: string };

/**
 * A számlához kötelező partner. Név alapján keressük, hogy ne szaporodjanak a
 * duplikátumok a Billingo címjegyzékében; ha nincs, létrehozzuk.
 */
async function partnerFor(buyer: Buyer): Promise<number> {
  const found = await call<{ data: Partner[] }>(
    `/partners?query=${encodeURIComponent(buyer.name)}&per_page=25`,
  );
  const exact = found.data.find(p => p.name.trim().toLowerCase() === buyer.name.trim().toLowerCase());
  if (exact) return exact.id;

  const created = await call<Partner>("/partners", {
    method: "POST",
    body: JSON.stringify({
      name:    buyer.name,
      address: { country_code: "HU", post_code: buyer.zip, city: buyer.city, address: buyer.address },
      emails:  buyer.email ? [buyer.email] : [],
    }),
  });
  return created.id;
}

// ── tételek ───────────────────────────────────────────────────────────────────

/**
 * Bruttó egységárral küldjük a tételeket: a Spellbookban minden ár az, amit a
 * vendég fizet, és így nem keletkezik kerekítési eltérés a végösszegben.
 */
function items(lines: Line[]) {
  return lines.map(l => ({
    name:            l.name,
    unit_price:      Math.round(l.gross),
    unit_price_type: "gross",
    quantity:        l.qty,
    unit:            l.unit,
    vat:             vatKey(),
  }));
}

type Document = { id: number; invoice_number?: string; document_number?: string };

function docNumber(d: Document): string {
  const n = d.invoice_number ?? d.document_number;
  if (!n) throw new BillingError("A Billingo nem adott vissza bizonylatszámot.");
  return n;
}

function day(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function pdfOf(id: number): Promise<string | null> {
  try {
    return await call<string>(`/documents/${id}/download`, { raw: true });
  } catch {
    // A bizonylat megvan, csak a PDF nem jött — ez nem ok a kiállítás eldobására.
    return null;
  }
}

// ── szolgáltató ───────────────────────────────────────────────────────────────

export const billingoProvider: BillingProvider = {
  name:  "billingo",
  label: "Billingo",

  isConfigured: () => Boolean(env.BILLINGO_API_KEY?.trim()),

  async createReceipt(opts) {
    const doc = await call<Document>("/documents/receipt", {
      method: "POST",
      body: JSON.stringify({
        block_id:       await blockId("receipt"),
        type:           "receipt",
        payment_method: PAYMENT[opts.payment],
        currency:       "HUF",
        vendor_id:      opts.orderRef,
        items:          items(opts.lines),
      }),
    });
    return { number: docNumber(doc), externalId: String(doc.id), pdf: await pdfOf(doc.id) };
  },

  async stornoReceipt(doc) {
    return cancel(doc);
  },

  async getReceiptPdf(doc) {
    const id = numericId(doc);
    return pdfOf(id);
  },

  async createInvoice(opts) {
    const created = await call<Document>("/documents", {
      method: "POST",
      body: JSON.stringify({
        partner_id:       await partnerFor(opts.buyer),
        block_id:         await blockId("invoice"),
        type:             "invoice",
        fulfillment_date: day(opts.date),
        due_date:         day(opts.date),
        payment_method:   PAYMENT[opts.payment],
        language:         "hu",
        currency:         "HUF",
        electronic:       true,
        paid:             opts.payment !== "átutalás",
        comment:          opts.comment,
        vendor_id:        opts.orderRef,
        items:            items(opts.lines),
      }),
    });
    return { number: docNumber(created), externalId: String(created.id), pdf: await pdfOf(created.id) };
  },

  async stornoInvoice(doc) {
    return cancel(doc);
  },
};

/** A sztornó a Billingónál egy új, "cancellation" bizonylat. */
async function cancel(doc: DocRef): Promise<IssuedDoc> {
  const id  = numericId(doc);
  const res = await call<Document>(`/documents/${id}/cancel`, { method: "POST" });
  return { number: docNumber(res), externalId: String(res.id), pdf: await pdfOf(res.id) };
}

/**
 * A Billingo minden műveletéhez a numerikus azonosító kell, nem a bizonylatszám.
 * Ha ez hiányzik, a bizonylat másik szolgáltatónál készült.
 */
function numericId(doc: DocRef): number {
  const id = Number(doc.externalId);
  if (!doc.externalId || Number.isNaN(id))
    throw new BillingError(
      `A(z) ${doc.number} bizonylathoz nincs Billingo-azonosító — valószínűleg másik szolgáltatónál készült.`
    );
  return id;
}
