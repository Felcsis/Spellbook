/**
 * Számlázó szolgáltatótól független bizonylat-fogalmak.
 *
 * Azért van külön réteg, mert a szolgáltató cserélhető (Számlázz.hu → Billingo),
 * a már kiállított bizonylatok viszont ott maradnak, ahol készültek: egy régi
 * nyugta sztornója és PDF-je csak az eredeti szolgáltatónál érhető el. Ezért a
 * bizonylat sorára elmentjük, melyik szolgáltató állította ki.
 */

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
  number:     string;        // a bizonylat száma, ahogy a vendég látja
  externalId: string | null; // a szolgáltató belső azonosítója (Billingónál ez kell a sztornóhoz)
  pdf:        string | null; // base64
};

/** Egy már kiállított bizonylat azonosítói — sztornóhoz és PDF-hez. */
export type DocRef = {
  number:     string;
  externalId: string | null;
};

export type ProviderName = "szamlazz" | "billingo";

export type BillingProvider = {
  name: ProviderName;
  /** Emberi név a hibaüzenetekhez és az adminhoz. */
  label: string;
  isConfigured(): boolean;

  createReceipt(opts: {
    lines:    Line[];
    payment:  PaymentMethod;
    comment?: string;
    orderRef?: string;
  }): Promise<IssuedDoc>;

  stornoReceipt(doc: DocRef): Promise<IssuedDoc>;
  getReceiptPdf(doc: DocRef): Promise<string | null>;

  createInvoice(opts: {
    lines:    Line[];
    buyer:    Buyer;
    payment:  PaymentMethod;
    date:     Date;
    comment?: string;
    orderRef?: string;
  }): Promise<IssuedDoc>;

  stornoInvoice(doc: DocRef, reason?: string): Promise<IssuedDoc>;
};

export class BillingError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "BillingError";
  }
}
