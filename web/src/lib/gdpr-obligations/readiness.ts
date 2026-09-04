import type { GdprCharacteristic, ObligationStatus } from "@/generated/prisma/enums";
import { getApplicableGdprObligations } from "./index";
import { computeComplianceScore, type ComplianceScore } from "@/lib/obligations/score";

/**
 * Readiness for a processing activity on the inventory list — reuses the
 * exact same score formula as the AI Act module (computeComplianceScore),
 * per the GDPR spec's instruction to share scoring logic wherever it
 * genuinely fits. An applicable obligation with no assessment row yet
 * counts as NOT_STARTED.
 */
export function computeProcessingActivityReadiness(activity: {
  characteristics: GdprCharacteristic[];
  obligationAssessments: { obligationId: string; status: ObligationStatus }[];
}): ComplianceScore {
  const applicable = getApplicableGdprObligations(activity);
  const statusByObligationId = new Map(activity.obligationAssessments.map((a) => [a.obligationId, a.status]));
  const statuses = applicable.map((o) => ({ status: statusByObligationId.get(o.id) ?? ("NOT_STARTED" as const) }));
  return computeComplianceScore(statuses);
}
