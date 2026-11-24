// Telling the client what its reviewer did. A notification is written in the
// same transaction as the change (classification confirmed or overridden,
// document released), so one never exists without the other. The client's
// company users see it in the Updates panel, and it is emailed to them once
// the change has committed (`dispatchNotifications`).

import type { Tx } from "@/lib/tenant";
import type { NotificationKind } from "@/generated/prisma/enums";
import { appUrl, sendEmail } from "@/lib/email";

export async function notifyClient(
  tx: Tx,
  n: { organizationId: string; clientId: string; kind: NotificationKind; title: string; body: string; link: string },
) {
  await tx.notification.create({ data: n });
}

/** The client's updates, newest first: those since `since` are new. */
export async function listUpdates(tx: Tx, clientId: string, take = 20) {
  return tx.notification.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take });
}

export async function markUpdatesSeen(tx: Tx, membershipId: string, at = new Date()) {
  await tx.membership.update({ where: { id: membershipId }, data: { updatesSeenAt: at } });
}

/**
 * Emails every notification of the organisation not yet dispatched to the
 * company users of its client. Runs after the change has committed; each
 * notification records whether it was sent, skipped (no provider, no
 * recipients) or failed, and is not retried automatically.
 */
export async function dispatchNotifications(tx: Tx, organizationId: string) {
  const pending = await tx.notification.findMany({
    where: { organizationId, emailStatus: null },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  for (const n of pending) {
    const members = await tx.membership.findMany({
      where: { organizationId, role: "COMPANY_USER", clientId: n.clientId },
      include: { user: { select: { email: true } } },
    });
    const result = await sendEmail({
      to: members.map((m) => m.user.email),
      subject: `${n.title} · ${n.client.name}`,
      text: [
        n.title,
        "",
        n.body,
        "",
        `Open it in the Governance Hub: ${appUrl()}${n.link}`,
        "",
        "SenecAI Compliance · Governance Hub",
      ].join("\n"),
    });
    await tx.notification.update({
      where: { id: n.id },
      data: { emailStatus: result.detail ? `${result.status}: ${result.detail}` : result.status, emailedAt: new Date() },
    });
  }
}
