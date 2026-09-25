/**
 * Szolgáltatás- és vendégstatisztika a vendégkártyákból.
 *
 * A vendégkártya a legrészletesebb forrás: benne van a szolgáltatás, az ára
 * (listaár, kedvezmény nélkül), az időtartama és a felhasznált anyag. Az
 * anyagot a vendég külön fizeti ("+felhasznált anyag" kategóriák) — áthaladó
 * pénz, nem a szalon költsége —, ezért az óránkénti kereset csak a
 * szolgáltatás díjából számolódik. A
 * bevételi sorokból (FinanceEntry) ez nem rakható össze, ezért itt nem azokat
 * használjuk — a két szám ezért kis mértékben eltérhet (kedvezmények).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, salonProcedure } from "~/server/api/trpc";

const DAY = 86_400_000;

/**
 * Ugyanaz a kategória többféleképpen van leírva ("Szőkítés (+ felhasznált anyag)"
 * és "Szőkítés (+felhasznált anyag)", "Festés / Színezés" és "Festés / színezés").
 * A kulcs kisbetűs és szóköz nélküli; a megjelenített név a leggyakoribb alak.
 */
function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}

/** A kategória rövid neve a zárójeles megjegyzés nélkül: "Szőkítés". */
function shortCat(s: string): string {
  return s.replace(/\s*\(.*\)\s*/g, "").trim() || s;
}

class Labeler {
  private seen = new Map<string, Map<string, number>>();
  add(key: string, label: string) {
    const m = this.seen.get(key) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    this.seen.set(key, m);
  }
  get(key: string): string {
    const m = this.seen.get(key);
    if (!m) return key;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]![0].trim();
  }
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

const adminOnly = (role: string | undefined) => {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
};

export const statsRouter = createTRPCRouter({
  /** Szolgáltatásonkénti bontás egy időszakra. */
  services: salonProcedure
    .input(z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // kizárólagos
    }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx.session.user.role);
      const cards = await ctx.db.guestCard.findMany({
        where: { date: { gte: new Date(`${input.from}T00:00:00Z`), lt: new Date(`${input.to}T00:00:00Z`) } },
        select: {
          id: true, guestId: true,
          worker:    { select: { name: true } },
          services:  { select: { name: true, price: true, duration: true, categoryName: true } },
          materials: { select: { lineTotal: true } },
        },
      });

      const labels = new Labeler();
      type Row = { category: string; name: string; count: number; revenue: number; minutes: number; material: number; workers: Record<string, number> };
      const rows = new Map<string, Row & { catKey: string }>();
      const pairs = new Map<string, number>();
      const workers = new Map<string, { visits: number; revenue: number; minutes: number; material: number; guests: Set<string>; catMinutes: Map<string, number> }>();
      let visits = 0, revenue = 0, minutes = 0, material = 0;

      for (const c of cards) {
        if (c.services.length === 0) continue;
        visits++;
        const cardMaterial = c.materials.reduce((s, m) => s + m.lineTotal, 0);
        const cardPrice    = c.services.reduce((s, x) => s + x.price, 0);
        const cardMinutes  = c.services.reduce((s, x) => s + x.duration, 0);
        const who = c.worker.name ?? "?";

        // Az anyag a kártyához tartozik, nem a szolgáltatáshoz: árarányosan osztjuk szét.
        // (Csak tájékoztató: a vendég fizeti, nem vonjuk le a keresetből.)
        const keys: string[] = [];
        for (const s of c.services) {
          const catKey = norm(s.categoryName) || "egyeb";
          labels.add(catKey, s.categoryName ?? "Egyéb");
          const key = `${catKey}|${norm(s.name)}`;
          labels.add(key, s.name);
          keys.push(key);
          const share = cardPrice > 0 ? s.price / cardPrice : 1 / c.services.length;
          const r = rows.get(key) ?? { catKey, category: "", name: "", count: 0, revenue: 0, minutes: 0, material: 0, workers: {} };
          r.count++; r.revenue += s.price; r.minutes += s.duration; r.material += cardMaterial * share;
          r.workers[who] = (r.workers[who] ?? 0) + 1;
          rows.set(key, r);
          const w0 = workers.get(who) ?? { visits: 0, revenue: 0, minutes: 0, material: 0, guests: new Set<string>(), catMinutes: new Map<string, number>() };
          w0.catMinutes.set(catKey, (w0.catMinutes.get(catKey) ?? 0) + s.duration);
          workers.set(who, w0);
        }
        const uniq = [...new Set(keys)].sort();
        for (let i = 0; i < uniq.length; i++)
          for (let j = i + 1; j < uniq.length; j++) {
            const k = `${uniq[i]}§${uniq[j]}`;
            pairs.set(k, (pairs.get(k) ?? 0) + 1);
          }

        const w = workers.get(who)!;
        w.visits++; w.revenue += cardPrice; w.minutes += cardMinutes; w.material += cardMaterial;
        w.guests.add(c.guestId);
        workers.set(who, w);
        revenue += cardPrice; minutes += cardMinutes; material += cardMaterial;
      }

      const perHour = (amount: number, mins: number) => (mins > 0 ? Math.round(amount / (mins / 60)) : null);
      const serviceLabel = (key: string) => {
        const catKey = key.split("|")[0]!;
        return `${shortCat(labels.get(catKey))} · ${labels.get(key)}`;
      };

      const services = [...rows.entries()].map(([key, r]) => {
        return {
          key,
          category: shortCat(labels.get(r.catKey)),
          name:     labels.get(key),
          count:    r.count,
          revenue:  Math.round(r.revenue),
          avgPrice: Math.round(r.revenue / r.count),
          avgMinutes: Math.round(r.minutes / r.count),
          material: Math.round(r.material),
          perHour:  perHour(r.revenue, r.minutes),
          workers:  Object.entries(r.workers).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        };
      }).sort((a, b) => b.revenue - a.revenue);

      const catMap = new Map<string, { category: string; count: number; revenue: number; material: number; minutes: number }>();
      for (const r of rows.values()) {
        const c = catMap.get(r.catKey) ?? { category: shortCat(labels.get(r.catKey)), count: 0, revenue: 0, material: 0, minutes: 0 };
        c.count += r.count; c.revenue += r.revenue; c.material += r.material; c.minutes += r.minutes;
        catMap.set(r.catKey, c);
      }
      const categories = [...catMap.values()].map(c => ({
        ...c,
        revenue: Math.round(c.revenue),
        material: Math.round(c.material),
        perHour: perHour(c.revenue, c.minutes),
        share: revenue > 0 ? c.revenue / revenue : 0,
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        totals: {
          visits,
          revenue: Math.round(revenue),
          material: Math.round(material),
          avgTicket: visits ? Math.round(revenue / visits) : 0,
          avgMinutes: visits ? Math.round(minutes / visits) : 0,
          perHour: perHour(revenue, minutes),
        },
        services,
        categories,
        workers: [...workers.entries()].map(([name, w]) => ({
          name,
          visits: w.visits,
          revenue: Math.round(w.revenue),
          avgTicket: Math.round(w.revenue / w.visits),
          avgMaterial: Math.round(w.material / w.visits),
          perHour: perHour(w.revenue, w.minutes),
          minutes: w.minutes,
          guests: w.guests.size,
          hoursShare: minutes > 0 ? w.minutes / minutes : 0,
          // Mire ment el az idő: kategóriánként, percben.
          byCategory: [...w.catMinutes.entries()]
            .map(([k, m]) => ({ category: shortCat(labels.get(k)), minutes: m }))
            .sort((a, b) => b.minutes - a.minutes),
        })).sort((a, b) => b.revenue - a.revenue),
        pairs: [...pairs.entries()]
          .filter(([, n]) => n >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([k, count]) => ({ a: serviceLabel(k.split("§")[0]!), b: serviceLabel(k.split("§")[1]!), count })),
      };
    }),

  /**
   * Vendégstatisztika a teljes előzményből: új/visszatérő, visszatérési idő,
   * törzsvendégek, és akik az szokásos idejükön túl sem jöttek vissza.
   */
  guests: salonProcedure.query(async ({ ctx }) => {
    adminOnly(ctx.session.user.role);
    const cards = await ctx.db.guestCard.findMany({
      orderBy: { date: "asc" },
      select: {
        date: true,
        guest:    { select: { id: true, name: true, phone: true } },
        worker:   { select: { name: true } },
        services: { select: { name: true, price: true, categoryName: true } },
      },
    });

    const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date()) + "T00:00:00Z");
    const labels = new Labeler();

    type Visit = { date: Date; spend: number; catKey: string; label: string; worker: string };
    const byGuest = new Map<string, { name: string; phone: string | null; visits: Visit[] }>();
    for (const c of cards) {
      // A kártya "fő" kategóriája a legdrágább szolgáltatásé — ez dönti el, mikorra várjuk vissza.
      const main = [...c.services].sort((a, b) => b.price - a.price)[0];
      const catKey = norm(main?.categoryName) || "egyeb";
      labels.add(catKey, main?.categoryName ?? "Egyéb");
      const g = byGuest.get(c.guest.id) ?? { name: c.guest.name, phone: c.guest.phone, visits: [] };
      g.visits.push({
        date:   c.date,
        spend:  c.services.reduce((s, x) => s + x.price, 0),
        catKey,
        label:  c.services.map(s => s.name.trim()).join(", ") || "—",
        worker: c.worker.name ?? "?",
      });
      byGuest.set(c.guest.id, g);
    }

    // Visszatérési idő kategóriánként: az előző látogatás fő kategóriája szerint.
    const gaps = new Map<string, number[]>();
    const allGaps: number[] = [];
    for (const g of byGuest.values())
      for (let i = 1; i < g.visits.length; i++) {
        const d = Math.round((g.visits[i]!.date.getTime() - g.visits[i - 1]!.date.getTime()) / DAY);
        if (d <= 0) continue; // ugyanaznapi második kártya
        const k = g.visits[i - 1]!.catKey;
        gaps.set(k, [...(gaps.get(k) ?? []), d]);
        allGaps.push(d);
      }
    const overallMedian = median(allGaps);
    const expected = (k: string) => {
      const xs = gaps.get(k) ?? [];
      // Kevés esetből félrevezető (egy családi kártya is lehúzza) — akkor az általános érték.
      return xs.length >= 10 ? median(xs)! : (overallMedian ?? 56);
    };

    // Havi bontás: hány különböző vendég jött, és közülük hány volt új.
    const months = new Map<string, { newGuests: Set<string>; returning: Set<string> }>();
    for (const [id, g] of byGuest)
      g.visits.forEach((v, i) => {
        const m = v.date.toISOString().slice(0, 7);
        const row = months.get(m) ?? { newGuests: new Set(), returning: new Set() };
        if (i === 0) row.newGuests.add(id);
        else if (!row.newGuests.has(id)) row.returning.add(id);
        months.set(m, row);
      });

    const guests = [...byGuest.values()];
    // Csak aki legalább 60 napja járt először, annak volt ideje visszajönni.
    const matured = guests.filter(g => (today.getTime() - g.visits[0]!.date.getTime()) / DAY >= 60);

    const lapsed = guests
      .map(g => {
        const last = g.visits[g.visits.length - 1]!;
        const since = Math.round((today.getTime() - last.date.getTime()) / DAY);
        const exp = expected(last.catKey);
        return {
          name: g.name, phone: g.phone,
          lastDate: last.date.toISOString().slice(0, 10),
          lastService: last.label, worker: last.worker,
          visits: g.visits.length,
          spend: Math.round(g.visits.reduce((s, v) => s + v.spend, 0)),
          since, expected: exp, overdue: since - exp,
        };
      })
      // Legalább 6 hét, és a szokásos idő másfélszerese is elmúlt.
      .filter(x => x.since >= 42 && x.since >= x.expected * 1.5)
      .sort((a, b) => b.spend - a.spend || b.overdue - a.overdue)
      .slice(0, 30);

    const spends = guests.map(g => ({
      name: g.name,
      visits: g.visits.length,
      spend: Math.round(g.visits.reduce((s, v) => s + v.spend, 0)),
      lastDate: g.visits[g.visits.length - 1]!.date.toISOString().slice(0, 10),
    }));

    return {
      totals: {
        guests: guests.length,
        visits: cards.length,
        returningShare: matured.length ? matured.filter(g => g.visits.length >= 2).length / matured.length : null,
        maturedGuests: matured.length,
        medianGap: overallMedian,
        avgSpendPerGuest: guests.length ? Math.round(spends.reduce((s, x) => s + x.spend, 0) / guests.length) : 0,
      },
      months: [...months.entries()].sort().map(([month, r]) => ({ month, newGuests: r.newGuests.size, returning: r.returning.size })),
      gapByCategory: [...gaps.entries()]
        .filter(([, xs]) => xs.length >= 5)
        .map(([k, xs]) => ({ category: shortCat(labels.get(k)), medianDays: median(xs)!, samples: xs.length }))
        .sort((a, b) => a.medianDays - b.medianDays),
      top: spends.sort((a, b) => b.spend - a.spend).slice(0, 10),
      lapsed,
    };
  }),
});
