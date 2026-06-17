export const STAFF_RATE = 0.6;

type ServiceLike = {
  name?: string | null;
  price?: number | null;
  priceSnap?: number | null;
  gender?: string | null;
  categoryName?: string | null;
  service?: {
    name?: string | null;
    gender?: string | null;
    category?: { name?: string | null } | null;
  } | null;
};

export type WageEntryLike = {
  type: string;
  amount: number;
  description?: string | null;
  guestCard?: { services?: ServiceLike[] | null } | null;
  workDay?: { services?: ServiceLike[] | null } | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isFullWageService(service: ServiceLike) {
  const name = normalize(service.name ?? service.service?.name);
  const gender = normalize(service.gender ?? service.service?.gender);
  const category = normalize(service.categoryName ?? service.service?.category?.name);
  const fullText = `${category} ${name}`;

  const isMale = gender === "ferfi" || fullText.includes("ferfi");
  const isFemale = gender === "no" || fullText.includes("noi") || fullText.includes("no ");

  const isShortHaircut = name.includes("rovid") && name.includes("hajvagas");
  const isDryHaircut = name.includes("szaraz") && name.includes("hajvagas");

  return (isMale && isShortHaircut) || (isFemale && isDryHaircut);
}

export function serviceWageAmount(service: ServiceLike) {
  const price = service.price ?? service.priceSnap ?? 0;
  return isFullWageService(service) ? price : price * STAFF_RATE;
}

export function servicesWageAmount(services: ServiceLike[] | null | undefined) {
  return Math.round((services ?? []).reduce((sum, service) => sum + serviceWageAmount(service), 0));
}

function entryServices(entry: WageEntryLike) {
  return entry.guestCard?.services ?? entry.workDay?.services ?? [];
}

export function entryWageAmount(entry: WageEntryLike) {
  if (entry.type !== "revenue") return 0;
  const services = entryServices(entry);
  if (services.length > 0) return servicesWageAmount(services);
  return Math.round(entry.amount * STAFF_RATE);
}

export function entriesWageAmount(entries: WageEntryLike[]) {
  return entries.reduce((sum, entry) => sum + entryWageAmount(entry), 0);
}
