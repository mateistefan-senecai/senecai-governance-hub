// Obligation mapping as configurable data (see docs/context/ai-act-platform-concept.md,
// architecture principles): which obligations apply is a lookup over category + the
// system's Module 1 outputs (legalRole, riskClassification), not per-obligation code.

import type { ObligationStatus } from "@/generated/prisma/enums";

export type ObligationCategory =
  | "GENERAL" // applies to any in-scope system, regardless of role/risk
  | "PROVIDER_HIGH_RISK" // Art. 8-22 — applies when legalRole is PROVIDER or BOTH and riskClassification is HIGH_RISK
  | "DEPLOYER_HIGH_RISK"; // Art. 26-27 — applies when legalRole is DEPLOYER or BOTH and riskClassification is HIGH_RISK

export type Obligation = {
  id: string;
  title: string;
  citation: string;
  category: ObligationCategory;
  description: string;
  /** The gap-assessment screen's yes/no/partially question for this obligation. */
  gapQuestion?: string;
};

export type ObligationPlanItem = {
  obligation: Obligation;
  assessment: {
    id: string;
    status: ObligationStatus;
    ownerName: string | null;
    dueDate: Date | null;
    note: string | null;
    reviewedByConsultant: boolean;
  };
};
