import "server-only";
import { env } from "~/env";

/**
 * Levélküldés a Brevo API-ján keresztül.
 *
 * A `colormecrazy.hu` domain hitelesítve van (SPF, DKIM, DMARC), ezért a levél a
 * szalon saját címéről megy, nem egy gmailes feladóról — ez a kézbesítés miatt
 * számít, a spam-szűrők a hitelesített domaint sokkal jobban kedvelik.
 *
 * Amit a levél SOHA nem tartalmazhat: korábbi látogatás, színrecept, összeg,
 * egészségi adat. Az e-mail nem biztonságos csatorna, és ezek jó része a GDPR
 * szerint különleges adat. Időpont, szolgáltatás és a lemondó link elég.
 */

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export class EmailError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "EmailError";
  }
}

/** Küldés csak akkor él, ha van API kulcs — enélkül a hívók csendben kihagyják. */
export function isConfigured(): boolean {
  return Boolean(env.BREVO_API_KEY?.trim());
}

/** A szalon értesítési címe: ide megy az "új foglalás érkezett". */
export function salonAddress(): string | null {
  return env.MAIL_SALON?.trim() || env.GDPR_CONTROLLER_EMAIL?.trim() || null;
}

export type Mail = {
  to:       { email: string; name?: string };
  subject:  string;
  html:     string;
  /** Sima szöveges változat. Ha nincs, a HTML-ből készítünk egyet. */
  text?:    string;
};

export async function send(mail: Mail): Promise<{ messageId: string }> {
  const key = env.BREVO_API_KEY?.trim();
  if (!key) throw new EmailError("Nincs beállítva a levélküldés (BREVO_API_KEY).");

  const from      = env.MAIL_FROM?.trim() || "idopont@colormecrazy.hu";
  const fromName  = env.MAIL_FROM_NAME?.trim() || "Color Me Crazy";
  // A domainen nincs postafiók, ezért a válasz egy valódi, olvasott címre menjen.
  const replyTo   = env.MAIL_REPLY_TO?.trim() || salonAddress();

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender:      { name: fromName, email: from },
      to:          [mail.to],
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject:     mail.subject,
      htmlContent: mail.html,
      textContent: mail.text ?? stripHtml(mail.html),
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { message?: string; code?: string };
      detail = [body.code, body.message].filter(Boolean).join(" — ") || detail;
    } catch { /* a törzs nem mindig JSON */ }
    throw new EmailError(`A levél nem ment el: ${detail}`, res.status);
  }

  const body = await res.json() as { messageId?: string };
  return { messageId: body.messageId ?? "" };
}

/** Egyszerű szöveges változat — a levelezők egy része ezt mutatja. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
