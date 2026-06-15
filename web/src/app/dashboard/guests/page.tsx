import { auth } from "~/server/auth";
import GuestsClient from "./_client";

export default async function GuestsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  return <GuestsClient isAdmin={isAdmin} />;
}
