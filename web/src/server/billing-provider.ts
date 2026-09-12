/**
 * Melyik számlázó szolgáltatóval dolgozunk.
 *
 * Két külön kérdés, és szándékosan nem ugyanaz a válasz:
 *  - ÚJ bizonylatot az aktuálisan beállított szolgáltató állít ki
 *  - RÉGI bizonylatot (sztornó, PDF) mindig az, amelyik kiállította
 *
 * Enélkül a szolgáltató-váltás után a korábbi nyugták sztornózhatatlanná
 * válnának, azt pedig jogszabály írja elő, hogy kezelhetők maradjanak.
 */

import { env } from "~/env";
import { billingoProvider } from "~/server/billingo";
import { szamlazzProvider } from "~/server/szamlazz";
import { BillingError, type BillingProvider, type ProviderName } from "~/server/billing-types";

const PROVIDERS: Record<ProviderName, BillingProvider> = {
  szamlazz: szamlazzProvider,
  billingo: billingoProvider,
};

/**
 * Az új bizonylatok szolgáltatója. Ha nincs kifejezetten beállítva, azt
 * választjuk, amelyikhez van kulcs — így a váltáshoz elég a kulcsot megadni.
 */
export function activeProvider(): BillingProvider {
  const chosen = env.BILLING_PROVIDER;
  if (chosen) return PROVIDERS[chosen];
  if (billingoProvider.isConfigured()) return billingoProvider;
  return szamlazzProvider;
}

/** Egy már kiállított bizonylat szolgáltatója. */
export function providerFor(name: string | null | undefined): BillingProvider {
  const p = PROVIDERS[(name ?? "szamlazz") as ProviderName];
  if (!p) throw new BillingError(`Ismeretlen számlázó szolgáltató: ${name}`);
  return p;
}

/** Van-e egyáltalán működő számlázás. */
export function isConfigured(): boolean {
  return activeProvider().isConfigured();
}
