import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, salonProcedure } from "~/server/api/trpc";
import { EmailError, isConfigured, salonAddress, send } from "~/server/email";
import { requestReceived } from "~/server/email-templates";

/**
 * Levélküldés állapota és próbaküldés.
 *
 * A kézbesítés az, ami mindig több munka, mint elsőre látszik: a DNS-rekordok
 * terjedése, a spam-szűrők, a feladónév. Ezért kell egy gomb, amivel bármikor
 * ellenőrizhető, hogy a rendszer tud-e levelet küldeni.
 */
export const emailRouter = createTRPCRouter({
  status: salonProcedure.query(() => ({
    configured: isConfigured(),
    salon:      salonAddress(),
  })),

  /** Próbalevél. Csak a szalon saját címére vagy a bejelentkezett dolgozóéra megy. */
  sendTest: salonProcedure
    .input(z.object({ to: z.string().email().optional() }).default({}))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Próbalevelet csak admin küldhet." });

      const to = input.to ?? salonAddress() ?? ctx.session.user.email ?? "";
      if (!to) throw new TRPCError({ code: "BAD_REQUEST", message: "Nincs cím, ahova küldhetnénk." });

      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(10, 0, 0, 0);

      const mail = requestReceived({
        guestName:  "Teszt Vendég",
        service:    "Hajvágás",
        workerName: ctx.session.user.name ?? "a szalon",
        start,
      });

      try {
        const r = await send({ to: { email: to }, subject: mail.subject, html: mail.html });
        return { ok: true, to, messageId: r.messageId };
      } catch (e) {
        if (e instanceof EmailError)
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        throw e;
      }
    }),
});
