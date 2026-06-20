import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { canSeeFinanceProfit } from "./_permissions";
import FinancesClient from "./_client";

export default async function FinancesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <FinancesClient
      isAdmin={session.user.role === "admin"}
      userId={session.user.id}
      canSeeProfit={canSeeFinanceProfit(session.user)}
    />
  );
}
