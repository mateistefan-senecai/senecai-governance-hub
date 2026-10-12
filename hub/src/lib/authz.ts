// Role checks (concept note §3, permission matrix). Tenant isolation is the
// database's job (row-level security); these functions decide what a role
// may do *inside* its organisation.

import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/lib/tenant";
import type { Ctx } from "@/lib/session";

/** Reviewers (consultants, lawyers) and org admins can approve, override and assess. */
export function canReview(ctx: Ctx): boolean {
  return ctx.role === "REVIEWER" || ctx.role === "ORG_ADMIN";
}

/** Org admins manage users, clients and branding. */
export function canAdmin(ctx: Ctx): boolean {
  return ctx.role === "ORG_ADMIN";
}

/** Clients this person may see: all (admin), assigned (reviewer), own (company user). */
export function clientWhere(ctx: Ctx): Prisma.ClientWhereInput {
  if (ctx.role === "ORG_ADMIN") return {};
  if (ctx.role === "REVIEWER") return { assignments: { some: { membershipId: ctx.membershipId } } };
  return { id: ctx.clientId ?? "__none__" };
}

/**
 * Loads a client the person may access, or renders 404. Not 403: we do not
 * confirm that a client exists to someone who may not see it.
 */
export async function requireClient(tx: Tx, ctx: Ctx, clientId: string) {
  const client = await tx.client.findFirst({ where: { AND: [{ id: clientId }, clientWhere(ctx)] } });
  if (!client) notFound();
  return client;
}

export async function requireSystem(tx: Tx, ctx: Ctx, clientId: string, systemId: string) {
  const client = await requireClient(tx, ctx, clientId);
  const system = await tx.aiSystem.findFirst({ where: { id: systemId, clientId: client.id } });
  if (!system) notFound();
  return { client, system };
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do this.") {
    super(message);
  }
}

export function assertReviewer(ctx: Ctx) {
  if (!canReview(ctx)) throw new ForbiddenError("Only a reviewer can do this.");
}

export function assertAdmin(ctx: Ctx) {
  if (!canAdmin(ctx)) throw new ForbiddenError("Only an organisation admin can do this.");
}
