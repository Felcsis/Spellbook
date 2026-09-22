/**
 * Árlisták.
 *
 * Egy dolgozó egy árlistán dolgozik (`User.priceListType`), és a kategóriák is
 * ehhez tartoznak (`ServiceCategory.priceListType`). Így a fodrász és a
 * kozmetikus nem látja egymás tételeit sem a rögzítésnél, sem a foglalónál.
 *
 * Azért itt, egy helyen: a lista korábban két helyen volt beégetve, és amikor
 * harmadik jött, mindkettőt meg kellett keresni.
 */

export const PRICE_LISTS = [
  { key: "master",    label: "Fodrász árlista",     icon: "✦" },
  { key: "beginner",  label: "Régi kezdő árlista",  icon: "◈" },
  { key: "kozmetika", label: "Kozmetika",           icon: "❀" },
] as const;

export type PriceList = (typeof PRICE_LISTS)[number]["key"];

export const PRICE_LIST_KEYS = PRICE_LISTS.map(l => l.key) as [PriceList, ...PriceList[]];

export function priceListLabel(key: string | null | undefined): string {
  return PRICE_LISTS.find(l => l.key === key)?.label ?? PRICE_LISTS[0].label;
}

export function priceListIcon(key: string | null | undefined): string {
  return PRICE_LISTS.find(l => l.key === key)?.icon ?? PRICE_LISTS[0].icon;
}
