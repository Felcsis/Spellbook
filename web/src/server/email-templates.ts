import "server-only";
import { env } from "~/env";

/**
 * A foglaláshoz tartozó levelek.
 *
 * Szándékosan visszafogottak: időpont, szolgáltatás, hely, és ami művelet kell.
 * Korábbi látogatás, színrecept, összeg nem kerül beléjük — az e-mail nem
 * biztonságos csatorna, és a receptek egészségi adatot is tartalmazhatnak.
 */

export type BookingMail = {
  guestName: string;
  service:   string;
  workerName: string;
  start:     Date;
  /** A vendég saját linkje: itt nézheti meg és mondhatja le az időpontot. */
  link?:     string;
};

const SALON = "Color Me Crazy";

function address(): string {
  return env.GDPR_CONTROLLER_ADDRESS?.trim() || "Nemes Takács utca 8, Szeged";
}

function phone(): string {
  return env.GDPR_CONTROLLER_PHONE?.trim() || "";
}

const fmt = (d: Date) =>
  d.toLocaleString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
    weekday: "long", hour: "2-digit", minute: "2-digit",
  });

/** Közös keret, hogy minden levél egyformán nézzen ki. */
function wrap(title: string, body: string): string {
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:540px;margin:0 auto;color:#2c2420">
  <h2 style="color:#5a8a72;font-weight:normal;margin:0 0 1rem">${title}</h2>
  ${body}
  <hr style="border:none;border-top:1px solid #e0d8cc;margin:1.5rem 0">
  <p style="font-size:13px;color:#8a8078;line-height:1.6;margin:0">
    ${SALON}<br>
    ${address()}${phone() ? `<br>${phone()}` : ""}
  </p>
</div>`;
}

function details(m: BookingMail): string {
  return `<table style="width:100%;border-collapse:collapse;margin:1rem 0">
    <tr><td style="padding:.35rem 0;color:#8a8078">Mikor</td>
        <td style="padding:.35rem 0;text-align:right"><strong>${fmt(m.start)}</strong></td></tr>
    <tr><td style="padding:.35rem 0;color:#8a8078">Mit</td>
        <td style="padding:.35rem 0;text-align:right"><strong>${m.service}</strong></td></tr>
    <tr><td style="padding:.35rem 0;color:#8a8078">Kihez</td>
        <td style="padding:.35rem 0;text-align:right"><strong>${m.workerName}</strong></td></tr>
  </table>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:1.25rem 0">
    <a href="${href}" style="display:inline-block;padding:.7rem 1.4rem;border-radius:8px;
       background:#5a8a72;color:#fff;text-decoration:none;font-size:15px">${label}</a>
  </p>`;
}

/** 1. A vendégnek, amikor beküldte a kérést. Még NEM visszaigazolás. */
export function requestReceived(m: BookingMail) {
  return {
    subject: `Megkaptuk az időpontkérésed — ${SALON}`,
    html: wrap("Megkaptuk a kérésed", `
      <p>Kedves ${m.guestName}!</p>
      <p>Az alábbi időpontot kérted. <strong>Ez még nem végleges</strong> — hamarosan
         visszajelzünk, hogy szabad-e.</p>
      ${details(m)}
      ${m.link ? button(m.link, "Kérés megtekintése") : ""}
    `),
  };
}

/** 2. A szalonnak, hogy van mit elbírálni. */
export function salonNotice(m: BookingMail, manageUrl: string) {
  return {
    subject: `Új időpontkérés — ${m.guestName}`,
    html: wrap("Új időpontkérés érkezett", `
      <p><strong>${m.guestName}</strong> időpontot kért.</p>
      ${details(m)}
      ${button(manageUrl, "Megnyitás a Spellbookban")}
    `),
  };
}

/** 3. A vendégnek, ha elfogadtátok. */
export function confirmed(m: BookingMail) {
  return {
    subject: `Megvan az időpontod — ${SALON}`,
    html: wrap("Megvan az időpontod!", `
      <p>Kedves ${m.guestName}!</p>
      <p>Az időpontodat visszaigazoltuk, várunk szeretettel.</p>
      ${details(m)}
      ${m.link ? button(m.link, "Időpont megtekintése vagy lemondása") : ""}
      <p style="font-size:14px;color:#8a8078">Ha mégsem tudsz jönni, kérünk, szólj
         időben — így másnak tudjuk adni a helyet.</p>
    `),
  };
}

/** 4. A vendégnek, ha nem fér bele. */
export function declined(m: BookingMail, reason?: string) {
  return {
    subject: `Az időpontkéréseddel kapcsolatban — ${SALON}`,
    html: wrap("Sajnos ez az időpont nem szabad", `
      <p>Kedves ${m.guestName}!</p>
      <p>A kért időpontot sajnos nem tudjuk vállalni.${reason ? ` ${reason}` : ""}</p>
      ${details(m)}
      <p>Írj vagy hívj minket, és keresünk másikat — szívesen segítünk.</p>
    `),
  };
}

/** 5. Emlékeztető az időpont előtt. */
export function reminder(m: BookingMail) {
  return {
    subject: `Emlékeztető: holnap várunk — ${SALON}`,
    html: wrap("Holnap várunk!", `
      <p>Kedves ${m.guestName}!</p>
      <p>Csak emlékeztetőül, holnap van az időpontod:</p>
      ${details(m)}
      ${m.link ? button(m.link, "Időpont megtekintése vagy lemondása") : ""}
    `),
  };
}
