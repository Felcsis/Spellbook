import { auth } from "~/server/auth";
import ExpensesClient from "./_client";

export default async function ExpensesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "admin";
  const userId  = session?.user.id ?? "";
  return <ExpensesClient isAdmin={isAdmin} userId={userId} />;
}
