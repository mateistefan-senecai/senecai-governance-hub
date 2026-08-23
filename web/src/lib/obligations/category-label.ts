import type { ObligationCategory } from "./types";

export const CATEGORY_LABEL: Record<ObligationCategory, { heading: string; feature: string }> = {
  GENERAL: { heading: "General obligations", feature: "Feature 2.1b" },
  PROVIDER_HIGH_RISK: { heading: "Provider — high-risk", feature: "Feature 2.1a" },
  DEPLOYER_HIGH_RISK: { heading: "Deployer — high-risk", feature: "Feature 2.1a" },
};

export const CATEGORY_ORDER: ObligationCategory[] = ["GENERAL", "PROVIDER_HIGH_RISK", "DEPLOYER_HIGH_RISK"];
