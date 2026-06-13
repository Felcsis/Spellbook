import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

const DATA = [
  {
    name: "Női hajvágás",
    services: [
      { name: "Rövid",         price: 9500,  duration: 30 },
      { name: "Félhosszú",     price: 11000, duration: 45 },
      { name: "Hosszú",        price: 13000, duration: 60 },
      { name: "Extra hosszú",  price: 14500, duration: 75 },
      { name: "Száraz hajvágás", price: 5000, duration: 20 },
    ],
  },
  {
    name: "Férfi hajvágás",
    services: [
      { name: "Rövid hajvágás",   price: 5200, duration: 25 },
      { name: "Közép hosszú",     price: 6000, duration: 30 },
      { name: "Férfi hosszú",     price: 7500, duration: 40 },
      { name: "Csak géppel",      price: 4200, duration: 20 },
      { name: "Szakáll igazítás", price: 2800, duration: 15 },
      { name: "Mosás",            price: 1500, duration: 10 },
    ],
  },
  {
    name: "Gyerek hajvágás (0–14 éves korig)",
    services: [
      { name: "Kis fiú hajvágás",  price: 4500, duration: 20 },
      { name: "Kis lány hajvágás", price: 5000, duration: 25 },
      { name: "Mosás",             price: 1500, duration: 10 },
    ],
  },
  {
    name: "Festés / színezés (+felhasznált anyag)",
    services: [
      { name: "Rövid",        price: 9500,  duration: 60 },
      { name: "Fél hosszú",   price: 10000, duration: 75 },
      { name: "Hosszú",       price: 11500, duration: 90 },
      { name: "Extra hosszú", price: 12500, duration: 105 },
    ],
  },
  {
    name: "Szőkítés (+felhasznált anyag)",
    services: [
      { name: "Tő szőkítés",            price: 13000, duration: 90,  description: "+felhasznált anyag" },
      { name: "Teljes szőkítés",         price: 15000, duration: 120, description: "+felhasznált anyag" },
      { name: "Balayage",                price: 18000, duration: 150, description: "+felhasznált anyag" },
      { name: "Melír",                   price: 6000,  duration: 60,  description: "6000 Ft/óra" },
      { name: "Korrekció",               price: 7000,  duration: 60,  description: "7000 Ft/óra" },
      { name: "Tartós festék",           price: 90,    duration: 0,   description: "90 Ft/g" },
      { name: "Féltartós színező",       price: 90,    duration: 0,   description: "90 Ft/g" },
      { name: "Fizikai színező",         price: 90,    duration: 0,   description: "90 Ft/g" },
      { name: "Toner",                   price: 110,   duration: 0,   description: "110 Ft/g" },
      { name: "Szőkítő",                 price: 80,    duration: 0,   description: "80 Ft/g" },
      { name: "Kötés erősítő szőkítő",  price: 10,    duration: 0,   description: "10 Ft/g" },
      { name: "Pigment eltávolító",      price: 5000,  duration: 45,  description: "5000 Ft/csomag" },
    ],
  },
  {
    name: "Különleges kezelések",
    services: [
      { name: "Fejmasszázs",                   price: 1500,  duration: 15 },
      { name: "Raszta készítés és javítás",    price: 6000,  duration: 60,  description: "6000 Ft/óra" },
      { name: "Műraszta felfonás",             price: 6000,  duration: 60,  description: "6000 Ft/óra" },
      { name: "Hajtetovalás",                  price: 3000,  duration: 30,  description: "3000 Ft/minta" },
      { name: "Steampod szolgáltatás",         price: 4500,  duration: 60,  description: "+mosás" },
      { name: "Hajgöndörítés / vasalás",       price: 5000,  duration: 45 },
      { name: "Alkalmi kontyok, frizurák",     price: 10000, duration: 60,  description: "10 000 Ft-tól" },
    ],
  },
];

async function main() {
  const user = await db.user.findFirst();
  if (!user) {
    console.error("Nincs felhasználó az adatbázisban. Előbb jelentkezz be az appban!");
    process.exit(1);
  }

  // Ne duplikáljon — töröljük a meglévő adatokat ha már van
  const existing = await db.serviceCategory.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`Már van ${existing} kategória. Töröljük és újra feltöltjük...`);
    await db.serviceCategory.deleteMany({ where: { userId: user.id } });
  }

  for (let i = 0; i < DATA.length; i++) {
    const cat = DATA[i]!;
    const created = await db.serviceCategory.create({
      data: {
        name:   cat.name,
        order:  i,
        userId: user.id,
        services: {
          create: cat.services.map((s, j) => ({
            name:        s.name,
            price:       s.price,
            duration:    s.duration,
            description: s.description ?? null,
            order:       j,
            userId:      user.id,
          })),
        },
      },
    });
    console.log(`✓ ${created.name} (${cat.services.length} tétel)`);
  }

  console.log("\n✦ Árlista sikeresen feltöltve!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
