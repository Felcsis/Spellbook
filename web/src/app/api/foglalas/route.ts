/**
 * Időpontkérés beküldése a nyilvános foglalóoldalról.
 *
 * A kérés NEM foglal azonnal helyet a szalonnál: előbb a vendég megerősíti a
 * címét (`/api/foglalas/megerosites`), és csak utána kerül a szalon elé. Így
 * egy kitalált címmel beküldött kérés nem ér el senkit.
 *
 * Amit a válasz kifelé mond, az szándékosan kevés: sikerült-e, és mi a teendő.
 * Azt soha nem áruljuk el, hogy egy sáv miért foglalt.
 */
import { randomBytes } from "crypto";
import { db } from "~/server/db";
import { corsHeaders, freeDays, json, appUrl, HORIZON_DAYS, LEAD_HOURS } from "~/server/booking-public";
import { isConfigured, send } from "~/server/email";
import { verifyEmail } from "~/server/email-templates";

export const dynamic = "force-dynamic";

/** Mennyi kérés mehet be egy nap alatt ugyanarról a címről és gépről. */
const MAX_PER_EMAIL = 3;
const MAX_PER_IP    = 8;

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

type Body = {
  nev?: string; email?: string; telefon?: string; megjegyzes?: string;
  dolgozo?: string; szolgaltatas?: string; kezdes?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Magyar telefonszám nagyvonalúan: legalább 9 számjegy, formátumra nem kötünk ki. */
const digits = (s: string) => s.replace(/\D/g, "");

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return json({ error: "Hibás kérés." }, origin, 400); }

  const name  = (body.nev ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.telefon ?? "").trim();
  const note  = (body.megjegyzes ?? "").trim();

  if (name.length < 2)        return json({ error: "Kérünk, add meg a neved." }, origin, 400);
  if (!EMAIL_RE.test(email))  return json({ error: "Az e-mail cím nem jó." }, origin, 400);
  if (digits(phone).length < 9) return json({ error: "A telefonszám nem jó." }, origin, 400);
  if (name.length > 100 || email.length > 150 || phone.length > 40 || note.length > 500)
    return json({ error: "Túl hosszú adat." }, origin, 400);

  if (!body.dolgozo || !body.szolgaltatas || !body.kezdes)
    return json({ error: "Hiányzik a dolgozó, a szolgáltatás vagy az időpont." }, origin, 400);

  const start = new Date(body.kezdes);
  if (isNaN(start.getTime())) return json({ error: "Hibás időpont." }, origin, 400);

  const earliest = new Date(Date.now() + LEAD_HOURS * 3600_000);
  const latest   = new Date(Date.now() + HORIZON_DAYS * 86_400_000);
  if (start < earliest) return json({ error: `Legalább ${LEAD_HOURS} órával előbb kérhetsz időpontot.` }, origin, 400);
  if (start > latest)   return json({ error: "Ilyen messzire még nem lehet időpontot kérni." }, origin, 400);

  const [worker, service] = await Promise.all([
    db.user.findFirst({
      where:  { id: body.dolgozo, active: true, onlineBookable: true },
      select: { id: true, name: true },
    }),
    db.service.findFirst({
      where:  { id: body.szolgaltatas, active: true },
      select: { id: true, name: true, duration: true },
    }),
  ]);
  if (!worker)  return json({ error: "Ehhez a kollégához most nem lehet online időpontot kérni." }, origin, 404);
  if (!service || service.duration <= 0)
    return json({ error: "Erre a szolgáltatásra nem lehet online időpontot kérni." }, origin, 400);

  // Visszaélés-szűrés. Ugyanaz a cím vagy gép ne tudjon tucatszám kérést betolni.
  const ip   = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [fromEmail, fromIp] = await Promise.all([
    db.booking.count({ where: { email, createdAt: { gte: dayAgo } } }),
    ip ? db.booking.count({ where: { ip, createdAt: { gte: dayAgo } } }) : Promise.resolve(0),
  ]);
  if (fromEmail >= MAX_PER_EMAIL || fromIp >= MAX_PER_IP)
    return json({ error: "Mostanában több kérés is érkezett erről a címről. Kérünk, hívj minket telefonon." }, origin, 429);

  // A szabad időpontot a szerver dönti el, nem a böngészőből kapott adat: a
  // listázás óta eltelt percekben más is elfoglalhatta a sávot.
  const dayKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const hhmm   = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const days   = await freeDays({ workerId: worker.id, minutes: service.duration, from: start, days: 1 });
  const free   = days.find(d => d.date === dayKey)?.slots ?? [];
  if (!free.includes(hhmm))
    return json({ error: "Ez az időpont közben elkelt. Kérünk, válassz másikat." }, origin, 409);

  const end = new Date(start.getTime() + service.duration * 60_000);

  const booking = await db.booking.create({
    data: {
      token:    randomBytes(24).toString("base64url"),
      name, email, phone,
      note:     note || null,
      workerId: worker.id,
      // Név és hossz a kérés pillanatából: egy későbbi árlista-módosítás ne
      // írja át visszamenőleg, mit kért a vendég.
      service:  service.name,
      minutes:  service.duration,
      startsAt: start,
      endsAt:   end,
      status:   "megerosites_varo",
      ip,
    },
    select: { id: true, token: true },
  });

  if (isConfigured()) {
    const mail = verifyEmail(
      { guestName: name, service: service.name, workerName: worker.name ?? "", start },
      `${appUrl()}/foglalas/${booking.token}/megerosites`,
    );
    try {
      await send({ to: { email, name }, subject: mail.subject, html: mail.html });
    } catch {
      // A kérés megvan; a levél újraküldhető. Ne dőljön el emiatt a beküldés.
      return json({ ok: true, emailSent: false, token: booking.token }, origin, 201);
    }
  }

  return json({ ok: true, emailSent: isConfigured(), token: booking.token }, origin, 201);
}
