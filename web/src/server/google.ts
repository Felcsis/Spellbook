/**
 * Google Naptár összekötés — dolgozónként külön Google-fiók.
 *
 * Miért dolgozónként: mindenki a saját naptárában dolgozik, és a saját
 * időpontjait látja. A hosszú életű `refresh_token` a `User` soron ül, és
 * csak a szerveren olvassuk — a kliens sosem kapja meg.
 *
 * Két irány:
 *  - Google → Spellbook: a naptárban lévő időpontok megjelennek a Spellbookban
 *  - Spellbook → Google: a rögzített munkaidő kikerül eseményként
 */

import { google } from "googleapis";
import { env } from "~/env";

/**
 * Írás is kell, mert a munkaidőt eseményként kiküldjük. Az e-mail cím csak azért,
 * hogy a dolgozó lássa, melyik fiókjával kötötte össze.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GoogleUser = {
  id:                 string;
  googleRefreshToken: string | null;
  googleCalendarId:   string | null;
};

export type CalendarEvent = {
  id:       string;
  title:    string;
  start:    string;   // ISO
  end:      string;   // ISO
  allDay:   boolean;
  location: string | null;
  notes:    string | null;
};

export class GoogleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleError";
  }
}

/** Az összekötés csak akkor működik, ha a Google-kliens adatai be vannak állítva. */
export function isConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

function oauth() {
  if (!isConfigured())
    throw new GoogleError(
      "A Google-összekötés nincs beállítva (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)."
    );
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * A Google engedélykérő oldalának címe.
 *
 * `access_type: offline` + `prompt: consent` kell, különben a Google csak az első
 * alkalommal ad refresh tokent, és egy újracsatlakozásnál üres kézzel maradnánk.
 */
export function authUrl(state: string): string {
  return oauth().generateAuthUrl({
    access_type:     "offline",
    prompt:          "consent",
    scope:           SCOPES,
    include_granted_scopes: true,
    state,
  });
}

/** A visszakapott kódból refresh token + a fiók e-mail címe. */
export async function exchangeCode(code: string): Promise<{ refreshToken: string; email: string | null }> {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token)
    throw new GoogleError(
      "A Google nem adott refresh tokent. Próbáld újra, és a Google oldalán engedélyezd a hozzáférést."
    );

  client.setCredentials(tokens);
  let email: string | null = null;
  try {
    const info = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
    email = info.data.email ?? null;
  } catch {
    // A fiók e-mailje csak kényelmi információ — ha nem jön meg, nem baj.
  }
  return { refreshToken: tokens.refresh_token, email };
}

function calendarFor(user: GoogleUser) {
  if (!user.googleRefreshToken)
    throw new GoogleError("Ez a dolgozó nincs összekötve a Google Naptárral.");
  const client = oauth();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  return {
    api:        google.calendar({ version: "v3", auth: client }),
    calendarId: user.googleCalendarId ?? "primary",
  };
}

/** A naptár eseményei egy időszakra, időrendben. */
export async function listEvents(user: GoogleUser, from: Date, to: Date): Promise<CalendarEvent[]> {
  const { api, calendarId } = calendarFor(user);
  const res = await api.events.list({
    calendarId,
    timeMin:      from.toISOString(),
    timeMax:      to.toISOString(),
    singleEvents: true,          // az ismétlődőket is külön eseményként kérjük
    orderBy:      "startTime",
    maxResults:   500,
  });

  return (res.data.items ?? [])
    .filter(e => e.status !== "cancelled" && e.id)
    .map(e => {
      const allDay = Boolean(e.start?.date);
      return {
        id:       e.id!,
        title:    e.summary ?? "(névtelen időpont)",
        start:    e.start?.dateTime ?? `${e.start?.date ?? ""}T00:00:00`,
        end:      e.end?.dateTime   ?? `${e.end?.date   ?? ""}T00:00:00`,
        allDay,
        location: e.location ?? null,
        notes:    e.description ?? null,
      };
    });
}

/**
 * Munkaidő kiküldése eseményként. Ha már van hozzá esemény, azt módosítjuk —
 * így egy nap szerkesztgetése nem szemeteli tele a naptárat.
 * A visszatérő érték az esemény azonosítója, amit a munkanapra elmentünk.
 */
export async function upsertEvent(user: GoogleUser, ev: {
  eventId?: string | null;
  title:    string;
  start:    Date;
  end:      Date;
  notes?:   string | null;
}): Promise<string | null> {
  const { api, calendarId } = calendarFor(user);
  const body = {
    summary:     ev.title,
    description: ev.notes ?? undefined,
    start:       { dateTime: ev.start.toISOString(), timeZone: "Europe/Budapest" },
    end:         { dateTime: ev.end.toISOString(),   timeZone: "Europe/Budapest" },
  };

  if (ev.eventId) {
    try {
      const res = await api.events.update({ calendarId, eventId: ev.eventId, requestBody: body });
      return res.data.id ?? ev.eventId;
    } catch {
      // Ha a naptárból kézzel törölték, essünk vissza új esemény létrehozására.
    }
  }
  const res = await api.events.insert({ calendarId, requestBody: body });
  return res.data.id ?? null;
}

/** Esemény törlése — a már törölt eseményt nem tekintjük hibának. */
export async function deleteEvent(user: GoogleUser, eventId: string): Promise<void> {
  const { api, calendarId } = calendarFor(user);
  try {
    await api.events.delete({ calendarId, eventId });
  } catch {
    // Ha már nincs meg, az épp a kívánt állapot.
  }
}
