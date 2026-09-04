import type { ObligationStatus } from "@/generated/prisma/enums";

export type ComplianceScore = {
  applicable: number;
  implemented: number;
  /** IN_PROGRESS — the gap assessment's "Partially" answer. */
  partially: number;
  /** Applicable obligations not fully IMPLEMENTED — Partially counts as a gap, same as NOT_STARTED. */
  openGaps: number;
  /** 0-100, rounded. Null when there's nothing applicable to score yet. */
  percent: number | null;
};

/**
 * Feature 2.2/2.3 — the compliance score. NOT_APPLICABLE obligations are
 * excluded from the denominator so a system with e.g. no FRIA duty isn't
 * penalized for not doing one. Partially-implemented obligations count for
 * half in the percent, matching the gap assessment's Yes/Partially/No/N/A
 * answer model — but a "Partially" is still an open gap, not a resolved
 * one, so `openGaps` only excludes fully IMPLEMENTED items. Shared by every
 * module (AI Act, GDPR, ...) — fix scoring bugs here, not per call site.
 */
export function computeComplianceScore(
  statuses: { status: ObligationStatus }[],
): ComplianceScore {
  const applicableItems = statuses.filter((s) => s.status !== "NOT_APPLICABLE");
  const implemented = applicableItems.filter((s) => s.status === "IMPLEMENTED").length;
  const partially = applicableItems.filter((s) => s.status === "IN_PROGRESS").length;
  const applicable = applicableItems.length;

  return {
    applicable,
    implemented,
    partially,
    openGaps: applicable - implemented,
    percent: applicable === 0 ? null : Math.round(((implemented + 0.5 * partially) / applicable) * 100),
  };
}
