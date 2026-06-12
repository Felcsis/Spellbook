import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import DashboardClient from "./_client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <DashboardClient user={session.user} />;
}
