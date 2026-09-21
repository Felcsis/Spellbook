/**
 * Kihez lehet online időpontot kérni, és milyen szolgáltatásra.
 *
 * Csak az `onlineBookable` dolgozók jelennek meg, így egy emberrel élesben
 * kipróbálható, mielőtt mindenki bekerül. A szolgáltatás-listát a Spellbook
 * árlistája adja — az időtartam onnan jön, és az dönti el a sáv hosszát.
 */
import { db } from "~/server/db";
import { bookingOpen, closedResponse, corsHeaders, json } from "~/server/booking-public";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  if (!bookingOpen()) return closedResponse(origin);

  const workers = await db.user.findMany({
    where:   { active: true, onlineBookable: true },
    orderBy: { name: "asc" },
    select:  { id: true, name: true, priceListType: true },
  });

  const categories = await db.serviceCategory.findMany({
    include: { services: { where: { active: true }, orderBy: { order: "asc" } } },
  });

  return json({
    workers: workers.map(w => ({
      id:   w.id,
      name: w.name ?? "",
      // Mindenki a saját árlistájáról dolgozik.
      services: categories
        .filter(c => c.priceListType === w.priceListType)
        .flatMap(c => c.services.map(s => ({
          id: s.id, name: s.name, category: c.name,
          minutes: s.duration, price: s.price,
        })))
        // Amihez előzetes egyeztetés kell, arra ne lehessen online foglalni.
        .filter(s => s.minutes > 0),
    })),
  }, origin);
}
