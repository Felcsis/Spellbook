/**
 * Szabad időpontok egy dolgozóra és egy szolgáltatásra.
 *
 * A válasz csak kezdési időpontokat tartalmaz — azt nem, hogy a többi sáv miért
 * foglalt. Ez nem elméleti óvatosság: a foglaltsági mintázatból kiolvasható
 * lenne, ki mikor jár a szalonba.
 */
import { db } from "~/server/db";
import { bookingOpen, closedResponse, corsHeaders, freeDays, json, HORIZON_DAYS } from "~/server/booking-public";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  if (!bookingOpen()) return closedResponse(origin);
  const url    = new URL(req.url);

  const workerId  = url.searchParams.get("dolgozo");
  const serviceId = url.searchParams.get("szolgaltatas");
  const fromParam = url.searchParams.get("tol");
  const days      = Math.min(Number(url.searchParams.get("napok") ?? 30) || 30, HORIZON_DAYS);
  // Kiegészítők (fejmasszázs, mosás…) plusz ideje. Nélküle rövidebb sávot
  // kínálnánk, mint amennyi a munka valójában — és csúszna az egész nap.
  const extra     = Math.min(Math.max(Number(url.searchParams.get("plusz") ?? 0) || 0, 0), 180);

  if (!workerId || !serviceId)
    return json({ error: "Hiányzik a dolgozó vagy a szolgáltatás." }, origin, 400);

  const service = await db.service.findFirst({
    where:  { id: serviceId, active: true },
    select: { id: true, name: true, duration: true, categoryId: true },
  });
  if (!service) return json({ error: "Nincs ilyen szolgáltatás." }, origin, 404);
  if (service.duration <= 0)
    return json({ error: "Erre a szolgáltatásra nem lehet online időpontot kérni." }, origin, 400);

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date();
  if (isNaN(from.getTime())) return json({ error: "Hibás dátum." }, origin, 400);

  const napok = await freeDays({
    workerId, minutes: service.duration + extra, from, days,
    serviceId: service.id, categoryId: service.categoryId,
  });

  return json({
    szolgaltatas: { nev: service.name, perc: service.duration + extra },
    napok,
  }, origin);
}
