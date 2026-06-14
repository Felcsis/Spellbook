import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import CalendarClient from "./_client";
import { MushroomBg } from "./_mushroom-bg";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <>
      <MushroomBg />
      <CalendarClient />
    </>
  );
}
