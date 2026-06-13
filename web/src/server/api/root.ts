import { postRouter } from "~/server/api/routers/post";
import { financeRouter } from "~/server/api/routers/finance";
import { calendarRouter } from "~/server/api/routers/calendar";
import { servicesRouter } from "~/server/api/routers/services";
import { materialsRouter } from "~/server/api/routers/materials";
import { guestsRouter } from "~/server/api/routers/guests";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  finance: financeRouter,
  calendar: calendarRouter,
  services: servicesRouter,
  materials: materialsRouter,
  guests: guestsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
