// When a new legal content version is published (e.g. the Digital Omnibus
// moving the high-risk dates), the obligations already recorded must show
// the dates of the current content, not of the version they were first built
// on. This moves every active obligation whose obligation still exists in
// the current content onto it: its application date is recomputed from the
// system's current classification, and an obligation already assessed whose
// date changed is flagged for re-assessment (spec §5: a change to the legal
// content reopens the assessment). Whether an obligation applies at all only
// changes when the system is reclassified.
//
// Runs at deploy time (scripts/content.ts publish), across all tenants, as
// the table owner: row-level security is lifted for this one transaction.

import type { PrismaClient } from "@/generated/prisma/client";
import { resolveDate } from "./engine";
import type { ContentBundle, Outputs } from "./types";

const TABLES = ["SystemObligation", "AiSystem", "Classification", "AuditEvent"];

export async function refreshObligationDates(prisma: PrismaClient, bundle: ContentBundle): Promise<number> {
  return prisma.$transaction(async (tx) => {
    for (const t of TABLES) await tx.$executeRawUnsafe(`ALTER TABLE "${t}" NO FORCE ROW LEVEL SECURITY`);
    const stale = await tx.systemObligation.findMany({
      where: { active: true, contentVersion: { not: bundle.version } },
      include: { system: { include: { classifications: { where: { isCurrent: true }, select: { effective: true } } } } },
    });
    let moved = 0;
    for (const o of stale) {
      const def = bundle.obligations.find((d) => d.key === o.obligationKey);
      if (!def) continue; // no longer in the library: left as recorded until reclassification
      const effective = (o.system?.classifications[0]?.effective as Outputs | undefined) ?? {};
      const date = resolveDate(bundle, def.appliesFrom, effective);
      const appliesFrom = date ? new Date(date) : null;
      const changed = o.appliesFrom?.getTime() !== appliesFrom?.getTime();
      await tx.systemObligation.update({
        where: { id: o.id },
        data: {
          contentVersion: bundle.version,
          appliesFrom,
          needsReassessment: o.needsReassessment || (changed && o.status !== "NOT_ASSESSED"),
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: o.organizationId,
          actorId: "system",
          actorName: "Legal content update",
          entityType: "SystemObligation",
          entityId: o.id,
          action: "obligation.content_updated",
          before: { contentVersion: o.contentVersion, appliesFrom: o.appliesFrom },
          after: { contentVersion: bundle.version, appliesFrom },
        },
      });
      moved += 1;
    }
    for (const t of TABLES) await tx.$executeRawUnsafe(`ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY`);
    return moved;
  }, { timeout: 120_000 });
}
