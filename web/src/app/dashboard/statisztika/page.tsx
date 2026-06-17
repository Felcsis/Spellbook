import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import StatisztikaClient from "./_client";

export default async function StatisztikaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return <StatisztikaClient userId={session.user.id ?? ""} />;
}
