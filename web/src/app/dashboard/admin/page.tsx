import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "~/app/dashboard/_sidebar";
import AdminClient from "./_client";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <SidebarLayout user={session.user} activeKey="admin">
      <AdminClient />
    </SidebarLayout>
  );
}
