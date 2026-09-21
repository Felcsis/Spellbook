import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "./_sidebar";
import DashboardClient from "./_client";
import { isCalendarOnly } from "~/server/auth/access";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // A csak naptáras dolgozó a szalon többi adatát nem látja.
  if (isCalendarOnly(session.user.role)) redirect("/dashboard/calendar");
  const isAdmin = session.user.role === "admin";
  return (
    <SidebarLayout user={session.user} activeKey="dashboard">
      <DashboardClient name={session.user.name} isAdmin={isAdmin} userId={session.user.id} />
    </SidebarLayout>
  );
}
