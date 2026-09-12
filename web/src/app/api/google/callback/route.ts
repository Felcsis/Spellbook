/**
 * A Google visszatérése az engedélyezés után: a kódot refresh tokenre váltjuk,
 * és a bejelentkezett dolgozó sorára mentjük.
 *
 * A tokent szándékosan itt, szerveroldalon mentjük — soha nem megy át a kliensen.
 */
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { exchangeCode } from "~/server/google";

export async function GET(req: Request) {
  const base    = process.env.AUTH_URL ?? "http://localhost:3000";
  const url     = new URL(req.url);
  const code    = url.searchParams.get("code");
  const state   = url.searchParams.get("state");
  const denied  = url.searchParams.get("error");

  const back = (status: string) => NextResponse.redirect(new URL(`/dashboard/calendar?google=${status}`, base));

  if (denied) return back("elutasitva");

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", base));

  // A state a kérést indító dolgozó azonosítója — másra nem menthetünk.
  if (!code || state !== session.user.id) return back("hibas-keres");

  try {
    const { refreshToken, email } = await exchangeCode(code);
    await db.user.update({
      where: { id: session.user.id },
      data:  {
        googleRefreshToken: refreshToken,
        googleEmail:        email,
        googleConnectedAt:  new Date(),
      },
    });
    return back("ok");
  } catch {
    return back("sikertelen");
  }
}
