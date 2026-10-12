import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

/**
 * Drops to the `hub_app` role for the transaction (migration `app_role`), so
 * row-level security applies even if the login role could bypass it.
 */
const SET_APP_ROLE = "SET LOCAL ROLE hub_app";

/**
 * Runs `fn` in a transaction scoped to one organisation. Row-level security
 * policies (migration `row_level_security`) only show rows whose
 * `organizationId` equals `orgId`, so a bug in a query cannot leak another
 * tenant's data. Every tenant-data read or write goes through here.
 */
export async function withTenant<T>(
  scope: { userId: string; orgId: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(SET_APP_ROLE);
    await tx.$executeRaw`SELECT set_config('app.user_id', ${scope.userId}, true), set_config('app.org_id', ${scope.orgId}, true)`;
    return fn(tx);
  });
}

/**
 * Runs `fn` knowing only who the user is — before an organisation is chosen.
 * Under RLS this sees the user's own memberships and the organisations they
 * belong to, and nothing else.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(SET_APP_ROLE);
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
