import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",   type: "email" },
        password: { label: "Jelszó",  type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;

        const valid = await compare(
          credentials.password as string,
          user.password,
        );

        return valid ? user : null;
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub  = user.id;
        token.role = (user as { role?: string }).role ?? "staff";
      }
      // Régi tokenekhez: lekérjük a role-t az adatbázisból
      if (!token.role && token.sub) {
        const dbUser = await db.user.findUnique({
          where:  { id: token.sub },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "staff";
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id:   token.sub ?? "",
        role: (token.role as string) ?? "staff",
      },
    }),
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
