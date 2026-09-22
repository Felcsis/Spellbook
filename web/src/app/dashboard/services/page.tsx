import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ServicesClient from "./_client";

/**
 * Az árlista a "csak naptár" dolgozónak is elérhető — a kozmetikus a saját
 * kezeléseit maga veszi fel. Amit lát és amihez hozzányúlhat, azt nem a
 * szerepkör szabja meg, hanem az, hogy melyik árlistán dolgozik és melyik
 * kategória az övé; ezt a szerver is ellenőrzi, nem csak a felület.
 */
export default async function ServicesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <ServicesClient
      isAdmin={session.user.role === "admin"}
      userId={session.user.id}
    />
  );
}
