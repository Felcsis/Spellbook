import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ServicesClient from "./_client";

export default async function ServicesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <ServicesClient isAdmin={session.user.role === "admin"} />;
}
