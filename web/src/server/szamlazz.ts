/**
 * Számlázz.hu Számla Agent kliens — nyugta és számla kiállítása.
 *
 * Miért így: a nyugta-adatszolgáltatás 2026-09-01-től kötelező a NAV felé, de a
 * saját adatszolgáltatáshoz NAV-engedély kellene. A Számlázz.hu engedélyezett
 * szolgáltató, és az általa kiállított nyugtákat automatikusan továbbítja a
 * NAV-nak — nekünk csak a bizonylatot kell nála kiállítanunk.
 *
 * A HTTP-réteg multipart/form-data: a mező NEVE maga a művelet
 * (pl. "action-szamla_agent_nyugta_create"), a tartalma az XML.
 * Séma: https://www.szamlazz.hu/szamla/docs/xsds/
 */

import { env } from "~/env";

const ENDPOINT = "https://www.szamlazz.hu/szamla/";

/** A bizonylat egy sora. Alanyi adómentesnél (AAM) net === gross és vat === 0. */
export type Line = {
  name:  string;
  qty:   number;
  unit:  string;
  net:   number;
  gross: number;
};

export type Buyer = {
  name:    string;
  zip:     string;
  city:    string;
  address: string;
  email?:  string;
};

export type PaymentMethod = "készpénz" | "bankkártya" | "átutalás";

export type IssuedDoc = {
  number: string;   // nyugtaszám vagy számlaszám
  pdf:    string | null; // base64
};

export class SzamlazzError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "SzamlazzError";
  }
}

/** Az áfakulcs: alanyi adómentesnél "AAM", egyébként a százalék ("27"). */
export function vatKey(): string {
  return env.SZAMLAZZ_VAT_KEY?.trim() ?? "AAM";
}

/** A számlázás csak akkor él, ha van Agent kulcs. Enélkül a UI el is rejti. */
export function isConfigured(): boolean {
  return Boolean(env.SZAMLAZZ_AGENT_KEY?.trim());
}

/**
 * A nyugtának és a számlának KÜLÖN előtagja (bizonylattömbje) van a Számlázz.hu-ban,
 * ezért két külön beállítás.
 *
 * A nyugtánál az előtag tényleg kötelező — sem kihagyni nem lehet (57-es séma-hiba),
 * sem üresen küldeni ("Hiányzó adat: nyugtaszám előtag", 7-es hiba). A számlánál
 * viszont elhagyható, olyankor a fiók alapértelmezett számlatömbje dönt.
 * Nem létező előtagot a Számlázz.hu nem hoz létre, hanem hibával elutasítja.
 */
function receiptPrefixTag(): string {
  return `<elotag>${esc(env.SZAMLAZZ_PREFIX_NYUGTA?.trim() ?? "")}</elotag>`;
}

function agentKey(): string {
  const key = env.SZAMLAZZ_AGENT_KEY?.trim();
  if (!key)
    throw new SzamlazzError(
      "Nincs beállítva a Számlázz.hu Agent kulcs (SZAMLAZZ_AGENT_KEY), így nem tudok bizonylatot kiállítani."
    );
  return key;
}

// ── XML ───────────────────────────────────────────────────────────────────────

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Egy elem, üres/undefined értéknél nem kerül bele az XML-be. */
function tag(name: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `<${name}>${esc(String(value))}</${name}>`;
}

/** Forintos kerekítés — a Számlázz.hu a netto+afa=brutto egyezést ellenőrzi. */
function ft(n: number): number {
  return Math.round(n);
}

function lineXml(l: Line, kind: "nyugta" | "szamla"): string {
  const net   = ft(l.net);
  const gross = ft(l.gross);
  const vat   = gross - net;
  const [netEl, vatEl, grossEl] =
    kind === "nyugta"
      ? ["netto", "afa", "brutto"]
      : ["nettoErtek", "afaErtek", "bruttoErtek"];
  return `<tetel>
      ${tag("megnevezes", l.name)}
      ${tag("mennyiseg", l.qty)}
      ${tag("mennyisegiEgyseg", l.unit)}
      ${tag("nettoEgysegar", ft(l.net / (l.qty || 1)))}
      ${tag("afakulcs", vatKey())}
      ${tag(netEl, net)}
      ${tag(vatEl, vat)}
      ${tag(grossEl, gross)}
    </tetel>`;
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

async function post(action: string, xml: string): Promise<string> {
  const form = new FormData();
  form.append(action, new Blob([xml], { type: "text/xml" }), "request.xml");

  const res = await fetch(ENDPOINT, { method: "POST", body: form });
  const body = await res.text();

  // A Számlázz.hu a hibát fejlécben is visszaadja, a törzs ilyenkor nem mindig XML.
  const headerError = res.headers.get("szlahu_error");
  const headerCode  = res.headers.get("szlahu_error_code");
  if (headerError)
    throw new SzamlazzError(decodeURIComponent(headerError.replace(/\+/g, " ")), headerCode ?? undefined);
  if (!res.ok) throw new SzamlazzError(`Számlázz.hu hiba (HTTP ${res.status}).`);

  return body;
}

/** Névtér-előtagtól függetlenül kiszedi az első ilyen nevű elem tartalmát. */
function pick(xml: string, name: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml);
  return m?.[1] ?? null;
}

function assertSuccess(xml: string): void {
  if (pick(xml, "sikeres") === "false") {
    const msg  = pick(xml, "hibauzenet") ?? "Ismeretlen hiba a Számlázz.hu-nál.";
    const code = pick(xml, "hibakod") ?? undefined;
    throw new SzamlazzError(msg, code);
  }
}

// ── Műveletek ─────────────────────────────────────────────────────────────────

/**
 * Nyugta kiállítása. A Számlázz.hu ezt géppel előállított nyugtaként kezeli, és
 * a NAV felé az adatszolgáltatást is elvégzi.
 */
export async function createReceipt(opts: {
  lines:   Line[];
  payment: PaymentMethod;
  comment?: string;
  orderRef?: string;
}): Promise<IssuedDoc> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtacreate xmlns="http://www.szamlazz.hu/xmlnyugtacreate">
  <beallitasok>
    ${tag("szamlaagentkulcs", agentKey())}
    <pdfLetoltes>true</pdfLetoltes>
  </beallitasok>
  <fejlec>
    ${receiptPrefixTag()}
    ${tag("fizmod", opts.payment)}
    <penznem>Ft</penznem>
    ${tag("megjegyzes", opts.comment)}
    ${tag("rendelesSzam", opts.orderRef)}
  </fejlec>
  <tetelek>
    ${opts.lines.map(l => lineXml(l, "nyugta")).join("\n    ")}
  </tetelek>
</xmlnyugtacreate>`;

  const res = await post("action-szamla_agent_nyugta_create", xml);
  assertSuccess(res);
  const number = pick(res, "nyugtaszam");
  if (!number) throw new SzamlazzError("A Számlázz.hu nem adott vissza nyugtaszámot.");
  return { number, pdf: pick(res, "nyugtaPdf") };
}

/** Nyugta sztornózása — a sztornó bizonylat száma jön vissza. */
export async function stornoReceipt(number: string): Promise<IssuedDoc> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtast xmlns="http://www.szamlazz.hu/xmlnyugtast">
  <beallitasok>
    ${tag("szamlaagentkulcs", agentKey())}
    <pdfLetoltes>true</pdfLetoltes>
  </beallitasok>
  <fejlec>
    ${tag("nyugtaszam", number)}
  </fejlec>
</xmlnyugtast>`;

  const res = await post("action-szamla_agent_nyugta_storno", xml);
  assertSuccess(res);
  const stornoNumber = pick(res, "nyugtaszam");
  if (!stornoNumber) throw new SzamlazzError("A Számlázz.hu nem adott vissza sztornó nyugtaszámot.");
  return { number: stornoNumber, pdf: pick(res, "nyugtaPdf") };
}

/** Egy korábbi nyugta PDF-je, hogy ne kelljen a bizonylatot nálunk tárolni. */
export async function getReceiptPdf(number: string): Promise<string | null> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtaget xmlns="http://www.szamlazz.hu/xmlnyugtaget">
  <beallitasok>
    ${tag("szamlaagentkulcs", agentKey())}
    <pdfLetoltes>true</pdfLetoltes>
  </beallitasok>
  <fejlec>
    ${tag("nyugtaszam", number)}
  </fejlec>
</xmlnyugtaget>`;

  const res = await post("action-szamla_agent_nyugta_get", xml);
  assertSuccess(res);
  return pick(res, "nyugtaPdf");
}

/**
 * Számla kiállítása — akkor, ha a vendég számlát kér. A vevő nevét és címét
 * ilyenkor kötelező megadni (az Áfa tv. 169. §-a szerint).
 */
export async function createInvoice(opts: {
  lines:    Line[];
  buyer:    Buyer;
  payment:  PaymentMethod;
  date:     Date;
  comment?: string;
  orderRef?: string;
}): Promise<IssuedDoc> {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const sendEmail = Boolean(opts.buyer.email);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <beallitasok>
    ${tag("szamlaagentkulcs", agentKey())}
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    ${tag("keltDatum", day(opts.date))}
    ${tag("teljesitesDatum", day(opts.date))}
    ${tag("fizetesiHataridoDatum", day(opts.date))}
    ${tag("fizmod", opts.payment)}
    <penznem>Ft</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    ${tag("megjegyzes", opts.comment)}
    ${tag("elotag", env.SZAMLAZZ_PREFIX_SZAMLA)}
    ${tag("rendelesSzam", opts.orderRef)}
  </fejlec>
  <elado></elado>
  <vevo>
    ${tag("nev", opts.buyer.name)}
    ${tag("irsz", opts.buyer.zip)}
    ${tag("telepules", opts.buyer.city)}
    ${tag("cim", opts.buyer.address)}
    ${tag("email", opts.buyer.email)}
    <sendEmail>${sendEmail}</sendEmail>
  </vevo>
  <tetelek>
    ${opts.lines.map(l => lineXml(l, "szamla")).join("\n    ")}
  </tetelek>
</xmlszamla>`;

  const res = await post("action-xmlagentxmlfile", xml);
  assertSuccess(res);
  const number = pick(res, "szamlaszam");
  if (!number) throw new SzamlazzError("A Számlázz.hu nem adott vissza számlaszámot.");
  return { number, pdf: pick(res, "pdf") };
}

/** Számla sztornózása. */
export async function stornoInvoice(number: string, reason?: string): Promise<IssuedDoc> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast">
  <beallitasok>
    ${tag("szamlaagentkulcs", agentKey())}
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    ${tag("szamlaszam", number)}
    ${tag("megjegyzes", reason)}
  </fejlec>
</xmlszamlast>`;

  const res = await post("action-szamla_agent_st", xml);
  assertSuccess(res);
  const stornoNumber = pick(res, "szamlaszam") ?? number;
  return { number: stornoNumber, pdf: pick(res, "pdf") };
}
