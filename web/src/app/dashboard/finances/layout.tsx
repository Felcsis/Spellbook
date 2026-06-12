import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "../_sidebar";

export default async function FinancesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return <SidebarLayout user={session.user} activeKey="finances">{children}</SidebarLayout>;
}
