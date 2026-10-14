/**
 * The app's tables live in their own PostgreSQL schema, so it can share a
 * database with other applications (the production database also holds the
 * retired prototype's tables in `public`) without any overlap.
 */
export const DB_SCHEMA = process.env.DB_SCHEMA || "hub";

/** Adds `schema=` to a connection string, for `prisma migrate`. */
export function withSchema(url: string | undefined): string | undefined {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set("schema", DB_SCHEMA);
  return u.toString();
}
