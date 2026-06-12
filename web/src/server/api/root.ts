import { postRouter } from "~/server/api/routers/post";
import { financeRouter } from "~/server/api/routers/finance";
import { calendarRouter } from "~/server/api/routers/calendar";
import { servicesRouter } from "~/server/api/routers/services";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  finance: financeRouter,
  calendar: calendarRouter,
  services: servicesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
