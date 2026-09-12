/**
 * A Google-összekötés indítása: átirányítás a Google engedélykérő oldalára.
 *
 * A `state`-be a bejelentkezett dolgozó azonosítója kerül, hogy a visszatéréskor
 * biztosan az ő sorára mentsük a tokent akkor is, ha közben másik fülön mást csinál.
 */
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { authUrl, isConfigured } from "~/server/google";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.AUTH_URL ?? "http://localhost:3000"));

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  if (!isConfigured())
    return NextResponse.redirect(new URL("/dashboard/calendar?google=nincs-beallitva", base));

  return NextResponse.redirect(authUrl(session.user.id));
}
