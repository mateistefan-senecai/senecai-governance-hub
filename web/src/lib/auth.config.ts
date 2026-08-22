import type { NextAuthConfig } from "next-auth";

// Edge-safe base config shared between the full auth.ts (Node runtime —
// route handlers, server actions, server components) and middleware.ts
// (Edge runtime). Must not import anything that pulls in the generated
// Prisma client — that's Node-only and breaks the Edge middleware bundle.
export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Self-hosted behind a (trusted) reverse proxy / arbitrary port in dev —
  // see https://errors.authjs.dev#untrustedhost.
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      return session;
    },
  },
} satisfies NextAuthConfig;
