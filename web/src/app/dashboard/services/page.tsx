import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ServicesClient from "./_client";
import { isCalendarOnly } from "~/server/auth/access";

export default async function ServicesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // A csak naptáras dolgozó a szalon többi adatát nem látja.
  if (isCalendarOnly(session.user.role)) redirect("/dashboard/calendar");
  return <ServicesClient isAdmin={session.user.role === "admin"} />;
}
