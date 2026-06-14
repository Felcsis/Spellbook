import { google } from "googleapis";
import { env } from "~/env";

function makeOAuth2() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/google-calendar/callback`,
  );
}

export function getGoogleAuthUrl() {
  const client = makeOAuth2();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });
}

export async function exchangeCodeForRefreshToken(code: string): Promise<string | null> {
  const client = makeOAuth2();
  const { tokens } = await client.getToken(code);
  return tokens.refresh_token ?? null;
}

export async function listGoogleEvents(
  refreshToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
) {
  const client = makeOAuth2();
  client.setCredentials({ refresh_token: refreshToken });
  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.events.list({
    calendarId,
    timeMin:      timeMin.toISOString(),
    timeMax:      timeMax.toISOString(),
    singleEvents: true,
    orderBy:      "startTime",
    maxResults:   250,
  });
  return (res.data.items ?? []).map(e => ({
    id:          e.id ?? "",
    summary:     e.summary ?? "(Névtelen esemény)",
    start:       e.start?.dateTime ?? e.start?.date ?? "",
    end:         e.end?.dateTime   ?? e.end?.date   ?? "",
    allDay:      !e.start?.dateTime,
    description: e.description ?? "",
    location:    e.location ?? "",
    htmlLink:    e.htmlLink ?? "",
    colorId:     e.colorId ?? "",
  }));
}

export async function listCalendars(refreshToken: string) {
  const client = makeOAuth2();
  client.setCredentials({ refresh_token: refreshToken });
  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.calendarList.list();
  return (res.data.items ?? []).map(c => ({
    id:      c.id ?? "primary",
    summary: c.summary ?? "Naptár",
    primary: c.primary ?? false,
  }));
}
