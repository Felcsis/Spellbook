import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "./_sidebar";
import DashboardClient from "./_client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <SidebarLayout user={session.user} activeKey="dashboard">
      <DashboardClient name={session.user.name} />
    </SidebarLayout>
  );
}
