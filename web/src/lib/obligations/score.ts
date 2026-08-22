import type { ObligationStatus } from "@/generated/prisma/enums";

export type ComplianceScore = {
  applicable: number;
  implemented: number;
  /** 0-100, rounded. Null when there's nothing applicable to score yet. */
  percent: number | null;
};

/**
 * Feature 2.2/2.3 — the compliance score. NOT_APPLICABLE obligations are
 * excluded from the denominator so a system with e.g. no FRIA duty isn't
 * penalized for not doing one.
 */
export function computeComplianceScore(
  statuses: { status: ObligationStatus }[],
): ComplianceScore {
  const applicableItems = statuses.filter((s) => s.status !== "NOT_APPLICABLE");
  const implemented = applicableItems.filter((s) => s.status === "IMPLEMENTED").length;
  const applicable = applicableItems.length;

  return {
    applicable,
    implemented,
    percent: applicable === 0 ? null : Math.round((implemented / applicable) * 100),
  };
}
