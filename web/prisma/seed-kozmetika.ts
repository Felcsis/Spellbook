/**
 * Kozmetikai árlista betöltése.
 *
 * Az árak a szalon weboldalának kozmetikai listájából valók. Az IDŐTARTAM
 * viszont javaslat: a weboldalon nincs, a foglalóhoz viszont kötelező, mert ez
 * adja a lefoglalt sáv hosszát. Ami nem stimmel, az Árlista oldalon átírható.
 *
 * Futtatás:
 *   npx tsx prisma/seed-kozmetika.ts            (helyi adatbázis)
 *   DATABASE_URL=... npx tsx prisma/seed-kozmetika.ts
 *
 * Kétszer lefuttatva sem csinál kárt: a meglévő tételt frissíti, nem duplázza.
 */
import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

/** Kihez tartozzon a lista. Felülírható: `KOZMETIKUS="Bogi" npx tsx ...` */
const WORKER = process.env.KOZMETIKUS ?? "Bogi";

const DATA = [
  {
    name: "Szempilla & szemöldök",
    services: [
      { name: "Szempilla festés",            price: 2500, duration: 20 },
      { name: "Szemöldök festés + igazítás", price: 3500, duration: 25 },
      { name: "Szempilla lifting",           price: 9500, duration: 75 },
      { name: "Hennás szemöldök styling",    price: 6500, duration: 45 },
    ],
  },
  {
    name: "Gyantázás",
    services: [
      { name: "Bajusz",        price: 1800, duration: 10 },
      { name: "Szemöldök",     price: 1800, duration: 15 },
      { name: "Hónalj",        price: 2600, duration: 15 },
      { name: "Teljes kar",    price: 3500, duration: 30 },
      { name: "Bikini vonal",  price: 3000, duration: 20 },
      { name: "Láb térdig",    price: 3000, duration: 30 },
      { name: "Teljes láb",    price: 5000, duration: 45 },
      { name: "Hát",           price: 3000, duration: 30 },
      { name: "Mellkas",       price: 3000, duration: 30 },
      { name: "Teljes fazon",  price: 6500, duration: 75 },
    ],
  },
  {
    name: "Smink & egyéb",
    services: [
      { name: "Alkalmi smink",       price: 11000, duration: 60 },
      { name: "Menyasszonyi smink",  price: 16000, duration: 90 },
      { name: "STUDEX fülbelövés",   price: 15000, duration: 20 },
    ],
  },
];

async function main() {
  const worker =
    (await db.user.findFirst({ where: { name: WORKER } })) ??
    (await db.user.findFirst({ where: { role: "admin" } }));

  if (!worker) throw new Error("Nincs kihez kötni a listát: se a kozmetikus, se admin nem található.");
  if (worker.name !== WORKER)
    console.log(`⚠ "${WORKER}" nincs a dolgozók közt — a lista ${worker.name} nevén jön létre.`);

  let catOrder = 0;
  for (const cat of DATA) {
    const existing = await db.serviceCategory.findFirst({
      where: { name: cat.name, priceListType: "kozmetika" },
    });

    const category = existing ?? await db.serviceCategory.create({
      data: { name: cat.name, priceListType: "kozmetika", order: catOrder, userId: worker.id },
    });
    catOrder++;

    let order = 0;
    for (const s of cat.services) {
      const had = await db.service.findFirst({ where: { categoryId: category.id, name: s.name } });
      if (had) {
        await db.service.update({
          where: { id: had.id },
          data:  { price: s.price, duration: s.duration, active: true, order },
        });
      } else {
        await db.service.create({
          data: {
            name: s.name, price: s.price, duration: s.duration,
            order, categoryId: category.id, userId: worker.id,
          },
        });
      }
      order++;
    }
    console.log(`✓ ${cat.name} — ${cat.services.length} tétel`);
  }

  // A kozmetikus a saját listáján dolgozzon, különben a foglaló a fodrász
  // tételeit kínálná hozzá.
  if (worker.name === WORKER && worker.priceListType !== "kozmetika") {
    await db.user.update({ where: { id: worker.id }, data: { priceListType: "kozmetika" } });
    console.log(`✓ ${worker.name} árlistája: kozmetika`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => void db.$disconnect());
