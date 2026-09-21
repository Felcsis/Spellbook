import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { canSeeFinanceProfit } from "./_permissions";
import FinancesClient from "./_client";
import { isCalendarOnly } from "~/server/auth/access";

export default async function FinancesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // A csak naptáras dolgozó a szalon többi adatát nem látja.
  if (isCalendarOnly(session.user.role)) redirect("/dashboard/calendar");
  return (
    <FinancesClient
      isAdmin={session.user.role === "admin"}
      userId={session.user.id}
      canSeeProfit={canSeeFinanceProfit(session.user)}
    />
  );
}
