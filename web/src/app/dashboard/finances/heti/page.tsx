import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { canSeeFinanceProfit } from "../_permissions";
import HetiClient from "./_client";

export default async function HetiPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <HetiClient isAdmin={session.user.role === "admin"} userId={session.user.id} canSeeProfit={canSeeFinanceProfit(session.user)} />;
}
