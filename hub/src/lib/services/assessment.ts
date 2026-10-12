// Step 5 (gap assessment) and step 6 (roadmap), Stage 1 form: the reviewer
// builds the initial assessment from the questionnaire answers and the
// client interview, because the evidence workflow arrives in Stage 2
// (spec §11). The engine rules that already hold:
//   - an obligation is marked compliant only with a recorded rationale;
//   - every gap or partial obligation has exactly one roadmap action.

import type { Tx } from "@/lib/tenant";
import type { ObligationStatus, SystemObligation } from "@/generated/prisma/client";
import type { ContentBundle, ObligationDef } from "@/lib/content/types";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";

export const ASSESSABLE: ObligationStatus[] = ["COMPLIANT", "PARTIAL", "GAP"];

export async function assessObligation(
  tx: Tx,
  actor: Actor,
  obligation: SystemObligation & { system: { clientId: string } },
  status: ObligationStatus,
  rationale: string,
  bundle: ContentBundle,
) {
  if (!ASSESSABLE.includes(status)) throw new ValidationError("Choose compliant, partial or gap.");
  if (!obligation.active) throw new ValidationError("This obligation no longer applies to the system.");
  const reason = rationale.trim();
  if (status === "COMPLIANT" && reason.length < 20) {
    throw new ValidationError("Record why the obligation is met (at least a sentence). Evidence will be required from Stage 2.");
  }

  const updated = await tx.systemObligation.update({
    where: { id: obligation.id },
    data: {
      status,
      statusRationale: reason || null,
      assessedById: actor.userId,
      assessedAt: new Date(),
      needsReassessment: false,
    },
  });
  await audit(tx, actor, {
    entityType: "SystemObligation",
    entityId: obligation.id,
    action: "obligation.assessed",
    before: { status: obligation.status, rationale: obligation.statusRationale },
    after: { status, rationale: reason },
  });

  const def = bundle.obligations.find((o) => o.key === obligation.obligationKey);
  if (status === "COMPLIANT") {
    // An open action nobody has asked for help with is no longer needed; one
    // already under way is closed by this assessment. (From Stage 2, closing
    // an action will require completion evidence instead.)
    await tx.action.deleteMany({ where: { systemObligationId: obligation.id, status: "OPEN", enquiryId: null } });
    await tx.action.updateMany({ where: { systemObligationId: obligation.id }, data: { status: "DONE" } });
  } else if (def) {
    await ensureAction(tx, updated, obligation.system.clientId, def);
  }
  return updated;
}

async function ensureAction(tx: Tx, so: SystemObligation, clientId: string, def: ObligationDef) {
  const phase = phaseFor(so.appliesFrom, def.action.effort);
  await tx.action.upsert({
    where: { systemObligationId: so.id },
    create: {
      organizationId: so.organizationId,
      clientId,
      systemObligationId: so.id,
      title: def.action.title,
      type: def.action.type,
      effort: def.action.effort,
      phase,
      ownerName: so.ownerName,
    },
    update: { phase },
  });
  // Reassessed from compliant back to partial or gap: the work is open again.
  await tx.action.updateMany({ where: { systemObligationId: so.id, status: "DONE" }, data: { status: "OPEN" } });
}

/**
 * Phase 1 — already applies or applies within 6 months.
 * Phase 2 — applies within 18 months, or later but a small (S) piece of work.
 * Phase 3 — everything else.
 */
export function phaseFor(appliesFrom: Date | null, effort: string, now = new Date()): number {
  if (!appliesFrom) return 2;
  const months = (appliesFrom.getTime() - now.getTime()) / (30 * 24 * 3600 * 1000);
  if (months <= 6) return 1;
  if (months <= 18 || effort === "S") return 2;
  return 3;
}

/**
 * Readiness = share of active obligations that are met (partial counts half;
 * not yet assessed counts as not met). Null until anything has been assessed,
 * so an unassessed system does not read as "0% ready".
 */
export function readiness(obligations: Pick<SystemObligation, "status" | "active">[]): number | null {
  const active = obligations.filter((o) => o.active);
  if (!active.some((o) => o.status !== "NOT_ASSESSED")) return null;
  const score = active.reduce((s, o) => s + (o.status === "COMPLIANT" ? 1 : o.status === "PARTIAL" ? 0.5 : 0), 0);
  return Math.round((score / active.length) * 100);
}
