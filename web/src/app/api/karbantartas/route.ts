/**
 * Napi karbantartás: emlékeztető levél, a régi kérések törlése és az
 * esedékes havi kiadások létrehozása.
 *
 * Kívülről hívható végpont, mert a Next.js nem futtat magától ütemezett
 * feladatot. Kulcs védi (`MAINT_KEY`): enélkül bárki tudná pörgetni a
 * levélküldést, és elfogyasztaná a napi keretet.
 *
 * Naponta egyszer kell hívni; többszöri futás nem okoz kárt.
 */
import { runBookingMaintenance } from "~/server/booking-maintenance";
import { materializeRecurringExpenses } from "~/server/recurring-expenses";
import { env } from "~/env";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const key = env.MAINT_KEY?.trim();
  // Kulcs nélkül a végpont zárva marad — nem "mindenkinek nyitva".
  if (!key) return false;
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return given.length === key.length && given === key;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: "Nincs jogosultság." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const result = await runBookingMaintenance();
  const recurringCreated = await materializeRecurringExpenses();
  return new Response(JSON.stringify({ ok: true, ...result, recurringCreated }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
