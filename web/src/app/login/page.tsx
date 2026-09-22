import { db } from "~/server/db";
import { LoginClient, type LoginUser } from "./_client";

/**
 * Belépés.
 *
 * A kártyák az adatbázisból jönnek, nem a kódból: ha felveszel egy dolgozót az
 * Adminban, magától megjelenik itt — korábban be volt égetve két fiók, és az
 * újak sehogy nem tudtak belépni.
 *
 * Csak a nevet és a belépési címet adjuk ki, jelszóról semmit. Ezek a címek
 * amúgy sem valódi postafiókok, a nevek pedig a szalon weboldalán is ott vannak.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users: LoginUser[] = (
    await db.user.findMany({
      where:   { active: true },
      select:  { name: true, email: true },
      orderBy: { name: "asc" },
    })
  )
    .filter((u): u is { name: string; email: string } => Boolean(u.email && u.name));

  return <LoginClient users={users} />;
}
