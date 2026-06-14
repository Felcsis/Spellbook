import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import EvesClient from "./_client";

export default async function EvesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <EvesClient isAdmin={session.user.role === "admin"} userId={session.user.id} />;
}
