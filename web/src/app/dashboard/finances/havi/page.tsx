import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { canSeeFinanceProfit } from "../_permissions";
import HaviClient from "./_client";

export default async function HaviPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <HaviClient isAdmin={session.user.role === "admin"} userId={session.user.id} canSeeProfit={canSeeFinanceProfit(session.user)} />;
}
