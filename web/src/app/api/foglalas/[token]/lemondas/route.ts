/**
 * A vendég lemondja az időpontját a saját tokenjével.
 *
 * Nincs bejelentkezés: a token kitalálhatatlan, és egy lemondást senkinek nem
 * éri meg meghamisítani. A regisztráció kényszere viszont sokakat elriasztana,
 * és akkor inkább nem szólnának — ami a szalonnak rosszabb.
 */
import { cancelBooking, corsHeaders, json } from "~/server/booking-public";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const origin = req.headers.get("origin");
  const token  = (await ctx.params).token ?? "";

  const r = await cancelBooking(token);
  if (r.ok) return json({ ok: true }, origin);

  const error =
    r.reason === "nincs"        ? "Nem találjuk ezt az időpontot."
  : r.reason === "lejart"       ? "Ez az időpont már elmúlt."
  :                               "Ezt az időpontot már lemondták.";
  return json({ ok: false, error }, origin, 400);
}
