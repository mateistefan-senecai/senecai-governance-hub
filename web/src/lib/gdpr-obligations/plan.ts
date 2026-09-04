import type { GdprObligationCategory, GdprObligationPlanItem } from "./types";
import { EXPERT_REVIEW_OBLIGATION_IDS } from "./plan-meta";

const TASK_VERB: Record<GdprObligationCategory, string> = {
  GENERAL: "Draft & roll out",
  TIED: "Put in place",
};

export type GdprActionPlanItem = {
  assessmentId: string;
  obligationId: string;
  task: string;
  description: string;
  citation: string;
  owner: string;
  deadline: Date;
  expertReviewRequired: boolean;
  status: GdprObligationPlanItem["assessment"]["status"];
};

/**
 * One action point per applicable obligation that isn't already
 * Implemented or N/A — mirrors the AI Act module's buildActionPlan.
 * Deadlines are a deterministic fortnightly cadence over the (stably
 * ordered) items array, same as the AI Act version, since nothing in the
 * design persists them.
 */
export function buildGdprActionPlan(
  items: GdprObligationPlanItem[],
  owner: { complianceOwnerName: string | null },
): GdprActionPlanItem[] {
  const actionable = items.filter(
    (item) => item.assessment.status !== "IMPLEMENTED" && item.assessment.status !== "NOT_APPLICABLE",
  );

  return actionable.map((item, index) => {
    const itemOwner =
      item.obligation.category === "GENERAL"
        ? "Compliance owner"
        : (owner.complianceOwnerName?.split(" ")[0] ?? "Compliance owner");

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14 * (index + 1));

    return {
      assessmentId: item.assessment.id,
      obligationId: item.obligation.id,
      task: `${TASK_VERB[item.obligation.category]} ${item.obligation.title.toLowerCase()}`,
      description: item.obligation.description,
      citation: item.obligation.citation,
      owner: itemOwner,
      deadline,
      expertReviewRequired: EXPERT_REVIEW_OBLIGATION_IDS.has(item.obligation.id),
      status: item.assessment.status,
    };
  });
}
