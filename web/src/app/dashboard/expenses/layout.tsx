import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SidebarLayout from "../_sidebar";

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return <SidebarLayout user={session.user} activeKey="expenses">{children}</SidebarLayout>;
}
