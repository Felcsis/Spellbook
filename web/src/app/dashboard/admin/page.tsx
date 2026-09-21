import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "~/app/dashboard/_sidebar";
import AdminClient from "./_client";
import { isCalendarOnly } from "~/server/auth/access";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // A csak naptáras dolgozó a szalon többi adatát nem látja.
  if (isCalendarOnly(session.user.role)) redirect("/dashboard/calendar");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <SidebarLayout user={session.user} activeKey="admin">
      <AdminClient />
    </SidebarLayout>
  );
}
