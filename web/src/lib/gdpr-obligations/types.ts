// Obligation mapping as configurable data — same architecture principle as
// the AI Act module (src/lib/obligations/types.ts): which obligations
// apply is a lookup over category + a Processing Activity's Module 1
// output (characteristics tags), not per-obligation code.

import type { GdprCharacteristic, ObligationStatus } from "@/generated/prisma/enums";

export type GdprObligationCategory =
  | "GENERAL" // org-wide, applies once any Processing Activity exists
  | "TIED"; // per Processing Activity, gated by characteristics tags

export type GdprObligation = {
  id: string;
  title: string;
  citation: string;
  category: GdprObligationCategory;
  description: string;
  /** The gap-assessment screen's yes/no/partially question for this obligation. */
  gapQuestion?: string;
  /**
   * TIED only. A list of AND-groups, OR'd together: the obligation applies
   * if the activity's characteristics are a superset of at least one group.
   * Omitted/empty = applies to every activity (e.g. "legal basis identified").
   * E.g. DPIA's [["SPECIAL_CATEGORY_DATA","LARGE_SCALE"], ["AUTOMATED_DECISION_MAKING"]]
   * reads as "(special-category AND large-scale) OR automated-decision-making".
   */
  requiresTagGroups?: GdprCharacteristic[][];
};

export type GdprObligationPlanItem = {
  obligation: GdprObligation;
  assessment: {
    id: string;
    status: ObligationStatus;
    ownerName: string | null;
    dueDate: Date | null;
    note: string | null;
    reviewedByConsultant: boolean;
  };
};
