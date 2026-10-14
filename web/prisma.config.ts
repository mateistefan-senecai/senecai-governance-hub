import "dotenv/config";
import { defineConfig } from "prisma/config";
import { withSchema } from "./src/lib/db-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection: a PgBouncer-style
    // pooler doesn't support the advisory lock `prisma migrate` takes.
    // DATABASE_URL_UNPOOLED is set on Vercel + Neon; local dev has no pooler.
    url: withSchema(process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"]),
  },
});
