import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Csak admin számára elérhető." });
}

export const adminRouter = createTRPCRouter({
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);
    return ctx.db.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
  }),

  createUser: protectedProcedure
    .input(z.object({
      name:     z.string().min(1),
      email:    z.string().email(),
      password: z.string().min(4),
      role:     z.enum(["admin", "staff"]),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ez az email már foglalt." });
      const hashed = await hash(input.password, 12);
      return ctx.db.user.create({
        data: { name: input.name, email: input.email, password: hashed, role: input.role },
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  updateUser: protectedProcedure
    .input(z.object({
      id:    z.string(),
      name:  z.string().min(1).optional(),
      email: z.string().email().optional(),
      role:  z.enum(["admin", "staff"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const { id, ...data } = input;
      return ctx.db.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  changePassword: protectedProcedure
    .input(z.object({ id: z.string(), password: z.string().min(4) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      const hashed = await hash(input.password, 12);
      return ctx.db.user.update({ where: { id: input.id }, data: { password: hashed }, select: { id: true } });
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      if (input.id === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Saját magadat nem törölheted." });
      return ctx.db.user.delete({ where: { id: input.id } });
    }),
});
