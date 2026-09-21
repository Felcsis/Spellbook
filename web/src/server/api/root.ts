import { postRouter } from "~/server/api/routers/post";
import { financeRouter } from "~/server/api/routers/finance";
import { calendarRouter } from "~/server/api/routers/calendar";
import { servicesRouter } from "~/server/api/routers/services";
import { materialsRouter } from "~/server/api/routers/materials";
import { guestsRouter } from "~/server/api/routers/guests";
import { adminRouter } from "~/server/api/routers/admin";
import { expensesRouter } from "~/server/api/routers/expenses";
import { backupRouter } from "~/server/api/routers/backup";
import { gdprRouter } from "~/server/api/routers/gdpr";
import { billingRouter } from "~/server/api/routers/billing";
import { gcalRouter } from "~/server/api/routers/gcal";
import { appointmentsRouter } from "~/server/api/routers/appointments";
import { timeOffRouter } from "~/server/api/routers/timeoff";
import { bookableRouter } from "~/server/api/routers/bookable";
import { emailRouter } from "~/server/api/routers/email";
import { bookingsRouter } from "~/server/api/routers/bookings";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  finance: financeRouter,
  calendar: calendarRouter,
  services: servicesRouter,
  materials: materialsRouter,
  guests: guestsRouter,
  admin: adminRouter,
  expenses: expensesRouter,
  backup: backupRouter,
  gdpr: gdprRouter,
  billing: billingRouter,
  gcal: gcalRouter,
  appointments: appointmentsRouter,
  timeOff: timeOffRouter,
  bookable: bookableRouter,
  email: emailRouter,
  bookings: bookingsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
