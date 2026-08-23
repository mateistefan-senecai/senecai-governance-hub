import type { LegalRole, ObligationStatus, RiskClassification } from "@/generated/prisma/enums";
import { getApplicableObligations } from "./index";
import { computeComplianceScore, type ComplianceScore } from "./score";

/**
 * Readiness for a system on the inventory list — same score formula as
 * Module 2, computed from whatever assessment rows already exist (no lazy
 * row creation here; that's `getObligationPlan`'s job on the Module 2
 * pages). An applicable obligation with no assessment row yet counts as
 * NOT_STARTED, which is the correct "hasn't been looked at" reading.
 */
export function computeSystemReadiness(system: {
  legalRole: LegalRole | null;
  riskClassification: RiskClassification | null;
  obligationAssessments: { obligationId: string; status: ObligationStatus }[];
}): ComplianceScore {
  const applicable = getApplicableObligations(system);
  const statusByObligationId = new Map(system.obligationAssessments.map((a) => [a.obligationId, a.status]));
  const statuses = applicable.map((o) => ({ status: statusByObligationId.get(o.id) ?? ("NOT_STARTED" as const) }));
  return computeComplianceScore(statuses);
}
