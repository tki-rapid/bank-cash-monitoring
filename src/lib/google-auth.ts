import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export function googleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "database" },
  pages: { signIn: "/" },
  providers: googleAuthConfigured()
    ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID as string, clientSecret: process.env.GOOGLE_CLIENT_SECRET as string })]
    : [],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const account = await prisma.user.findUnique({ where: { email: user.email }, select: { active: true } });
      return account?.active === true;
    },
  },
};
