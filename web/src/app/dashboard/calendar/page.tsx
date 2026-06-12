import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import CalendarClient from "./_client";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <CalendarClient />;
}
