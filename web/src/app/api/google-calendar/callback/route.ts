import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { exchangeCodeForRefreshToken } from "~/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/calendar?google=error", req.url));
  }

  try {
    const refreshToken = await exchangeCodeForRefreshToken(code);
    if (!refreshToken) throw new Error("No refresh token");

    await db.salonSetting.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", googleRefreshToken: refreshToken, googleCalendarId: "primary" },
      update: { googleRefreshToken: refreshToken },
    });

    return NextResponse.redirect(new URL("/dashboard/calendar?google=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/calendar?google=error", req.url));
  }
}
