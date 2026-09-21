import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    SPELLBOOK_DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GOOGLE_CLIENT_ID:     z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI:  z.string().optional(),

    // GDPR — az adatkezelő adatai, a /adatkezeles oldalra és az adatexportba.
    GDPR_CONTROLLER_NAME:    z.string().optional(),
    GDPR_CONTROLLER_LEGAL:   z.string().optional(),
    GDPR_CONTROLLER_ADDRESS: z.string().optional(),
    GDPR_CONTROLLER_REGNO:   z.string().optional(),
    GDPR_CONTROLLER_EMAIL:   z.string().optional(),
    GDPR_CONTROLLER_PHONE:   z.string().optional(),

    // Számlázz.hu Számla Agent — nyugta/számla kiállítása és NAV-adatszolgáltatás.
    // Agent kulcs nélkül a bizonylat-funkció egyszerűen nem jelenik meg.
    SZAMLAZZ_AGENT_KEY: z.string().optional(),
    // A nyugtának és a számlának külön előtagja (bizonylattömbje) van a Számlázz.hu-ban.
    SZAMLAZZ_PREFIX_NYUGTA: z.string().optional(),
    SZAMLAZZ_PREFIX_SZAMLA: z.string().optional(),
    SZAMLAZZ_VAT_KEY:   z.string().optional(),  // régi név, a BILLING_VAT_KEY váltotta

    // Számlázó szolgáltató: "szamlazz" vagy "billingo". A már kiállított
    // bizonylatok akkor is az eredeti szolgáltatónál maradnak, ha ez átáll.
    BILLING_PROVIDER: z.enum(["szamlazz", "billingo"]).optional(),
    BILLING_VAT_KEY:  z.string().optional(),  // "AAM" (alanyi adómentes) vagy pl. "27"

    BILLINGO_API_KEY:       z.string().optional(),
    BILLINGO_BLOCK_RECEIPT: z.string().optional(),  // csak ha nem az elsőt akarjuk
    BILLINGO_BLOCK_INVOICE: z.string().optional(),

    // Levélküldés (Brevo). A colormecrazy.hu domain hitelesítve van.
    BREVO_API_KEY:  z.string().optional(),
    MAIL_FROM:      z.string().optional(),   // idopont@colormecrazy.hu
    MAIL_FROM_NAME: z.string().optional(),   // "Color Me Crazy"
    MAIL_REPLY_TO:  z.string().optional(),   // a domainen nincs postafiók
    MAIL_SALON:     z.string().optional(),   // ide megy az értesítés a szalonnak

    // A szalon látogatható címe. NEM azonos a székhellyel: a GDPR_CONTROLLER_ADDRESS
    // a vállalkozás bejegyzett székhelye (számlára, tájékoztatóra), ez pedig az,
    // ahova a vendég megy.
    SALON_ADDRESS:  z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET:          process.env.AUTH_SECRET,
    SPELLBOOK_DATABASE_URL: process.env.SPELLBOOK_DATABASE_URL,
    NODE_ENV:             process.env.NODE_ENV,
    GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI:  process.env.GOOGLE_REDIRECT_URI,

    GDPR_CONTROLLER_NAME:    process.env.GDPR_CONTROLLER_NAME,
    GDPR_CONTROLLER_LEGAL:   process.env.GDPR_CONTROLLER_LEGAL,
    GDPR_CONTROLLER_ADDRESS: process.env.GDPR_CONTROLLER_ADDRESS,
    GDPR_CONTROLLER_REGNO:   process.env.GDPR_CONTROLLER_REGNO,
    GDPR_CONTROLLER_EMAIL:   process.env.GDPR_CONTROLLER_EMAIL,
    GDPR_CONTROLLER_PHONE:   process.env.GDPR_CONTROLLER_PHONE,

    SZAMLAZZ_AGENT_KEY: process.env.SZAMLAZZ_AGENT_KEY,
    SZAMLAZZ_PREFIX_NYUGTA: process.env.SZAMLAZZ_PREFIX_NYUGTA,
    SZAMLAZZ_PREFIX_SZAMLA: process.env.SZAMLAZZ_PREFIX_SZAMLA,
    SZAMLAZZ_VAT_KEY:   process.env.SZAMLAZZ_VAT_KEY,

    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_VAT_KEY:  process.env.BILLING_VAT_KEY ?? process.env.SZAMLAZZ_VAT_KEY,

    BILLINGO_API_KEY:       process.env.BILLINGO_API_KEY,
    BILLINGO_BLOCK_RECEIPT: process.env.BILLINGO_BLOCK_RECEIPT,
    BILLINGO_BLOCK_INVOICE: process.env.BILLINGO_BLOCK_INVOICE,

    BREVO_API_KEY:  process.env.BREVO_API_KEY,
    MAIL_FROM:      process.env.MAIL_FROM,
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
    MAIL_REPLY_TO:  process.env.MAIL_REPLY_TO,
    MAIL_SALON:     process.env.MAIL_SALON,
    SALON_ADDRESS:  process.env.SALON_ADDRESS,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
