import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import NapiClient from "./_client";

export default async function NapiPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <NapiClient isAdmin={session.user.role === "admin"} userId={session.user.id} />;
}
