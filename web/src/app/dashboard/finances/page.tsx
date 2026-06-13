import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import FinancesClient from "./_client";

export default async function FinancesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <FinancesClient isAdmin={session.user.role === "admin"} />;
}
