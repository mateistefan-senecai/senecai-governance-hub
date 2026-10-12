import type { NextAuthConfig } from "next-auth";

// Edge-safe base config shared with src/proxy.ts. Must not import Prisma.
// The token only carries the user id: roles live on memberships, which are
// per organisation and are read from the database on every request
// (src/lib/session.ts), so a revoked membership takes effect immediately.
export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
