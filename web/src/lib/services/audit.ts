import type { Tx } from "@/lib/tenant";

export type Actor = { userId: string; userName: string; orgId: string };

/**
 * Appends to the audit log (append-only in the database). Call it inside the
 * same transaction as the change it records, so one never exists without the
 * other.
 */
export async function audit(
  tx: Tx,
  actor: Actor,
  event: { entityType: string; entityId: string; action: string; before?: unknown; after?: unknown },
) {
  await tx.auditEvent.create({
    data: {
      organizationId: actor.orgId,
      actorId: actor.userId,
      actorName: actor.userName,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      before: event.before === undefined ? undefined : (event.before as object),
      after: event.after === undefined ? undefined : (event.after as object),
    },
  });
}
