import { PrismaClient } from "../generated/prisma";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const users = [
    { name: "Felicia", email: "felicia@salon-spellbook.local", password: "X7TgFnwm2fE58PXx" },
    { name: "Gitta",   email: "gitta@salon-spellbook.local",   password: "N#7e@rg3@Vue9M43" },
    { name: "Lili",    email: "lili@salon-spellbook.local",    password: "dtB6Sy@@ST2qhwXT" },
  ];

  for (const u of users) {
    await db.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: await hash(u.password, 12) },
    });
    console.log(`✓ ${u.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
