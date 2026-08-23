import type { ObligationCategory, ObligationPlanItem } from "./types";
import { EXPERT_REVIEW_OBLIGATION_IDS } from "./plan-meta";

const TASK_VERB: Record<ObligationCategory, string> = {
  GENERAL: "Draft & roll out",
  PROVIDER_HIGH_RISK: "Build & document",
  DEPLOYER_HIGH_RISK: "Put in place",
};

export type ActionPlanItem = {
  assessmentId: string;
  obligationId: string;
  task: string;
  description: string;
  citation: string;
  owner: string;
  deadline: Date;
  expertReviewRequired: boolean;
  status: ObligationPlanItem["assessment"]["status"];
};

/**
 * Feature 2.3 — one action point per applicable obligation that isn't
 * already Implemented or N/A. Deadlines are a deterministic fortnightly
 * cadence over the (stably ordered) items array rather than a stored date,
 * since nothing in the design persists them.
 */
export function buildActionPlan(
  items: ObligationPlanItem[],
  system: { complianceOwnerName: string | null },
): ActionPlanItem[] {
  const actionable = items.filter(
    (item) => item.assessment.status !== "IMPLEMENTED" && item.assessment.status !== "NOT_APPLICABLE",
  );

  return actionable.map((item, index) => {
    const owner =
      item.obligation.category === "GENERAL"
        ? "Compliance owner"
        : (system.complianceOwnerName?.split(" ")[0] ?? "Compliance owner");

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14 * (index + 1));

    return {
      assessmentId: item.assessment.id,
      obligationId: item.obligation.id,
      task: `${TASK_VERB[item.obligation.category]} ${item.obligation.title.toLowerCase()}`,
      description: item.obligation.description,
      citation: item.obligation.citation,
      owner,
      deadline,
      expertReviewRequired: EXPERT_REVIEW_OBLIGATION_IDS.has(item.obligation.id),
      status: item.assessment.status,
    };
  });
}
