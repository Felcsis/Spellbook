import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getGoogleAuthUrl, listGoogleEvents, listCalendars } from "~/lib/google-calendar";

export const googleCalendarRouter = createTRPCRouter({
  status: protectedProcedure.query(async ({ ctx }) => {
    const s = await ctx.db.salonSetting.findUnique({ where: { id: "singleton" } });
    return {
      connected:  !!s?.googleRefreshToken,
      calendarId: s?.googleCalendarId ?? "primary",
    };
  }),

  authUrl: protectedProcedure.query(() => {
    return { url: getGoogleAuthUrl() };
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.role !== "admin") throw new Error("Csak admin!");
    await ctx.db.salonSetting.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", googleRefreshToken: null },
      update: { googleRefreshToken: null },
    });
  }),

  calendars: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "admin") return [];
    const s = await ctx.db.salonSetting.findUnique({ where: { id: "singleton" } });
    if (!s?.googleRefreshToken) return [];
    return listCalendars(s.googleRefreshToken);
  }),

  setCalendar: protectedProcedure
    .input(z.object({ calendarId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin") throw new Error("Csak admin!");
      await ctx.db.salonSetting.upsert({
        where:  { id: "singleton" },
        create: { id: "singleton", googleCalendarId: input.calendarId },
        update: { googleCalendarId: input.calendarId },
      });
    }),

  events: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const s = await ctx.db.salonSetting.findUnique({ where: { id: "singleton" } });
      if (!s?.googleRefreshToken) return [];
      const timeMin = new Date(input.year, input.month - 1, 1);
      const timeMax = new Date(input.year, input.month, 1);
      try {
        return await listGoogleEvents(s.googleRefreshToken, s.googleCalendarId ?? "primary", timeMin, timeMax);
      } catch {
        return [];
      }
    }),
});
