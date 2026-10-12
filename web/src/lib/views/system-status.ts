import type { Classification, SystemObligation } from "@/generated/prisma/client";
import type { Outputs } from "@/lib/content/types";

type Sys = {
  id: string;
  classificationStale: boolean;
  classifications: Pick<Classification, "status" | "effective">[];
  systemObligations: Pick<SystemObligation, "status" | "active" | "needsReassessment">[];
};

export type NextStep = { label: string; urgent: boolean; href: string };

/**
 * The one thing to do next on a system, in workflow order: classify,
 * review the classification, assess obligations, then work the roadmap.
 */
export function nextStep(system: Sys, base: string, isReviewer: boolean): NextStep | null {
  const href = `${base}/systems/${system.id}`;
  const current = system.classifications[0];
  if (!current) return { label: "Classify", urgent: true, href: `${href}/classify` };
  if (system.classificationStale) return { label: "Reclassify — system changed", urgent: true, href: `${href}/classify` };
  if (current.status === "PRELIMINARY") {
    return { label: isReviewer ? "Review classification" : "Awaiting reviewer", urgent: isReviewer, href };
  }
  const active = system.systemObligations.filter((o) => o.active);
  const recheck = active.filter((o) => o.needsReassessment).length;
  if (recheck) return { label: `Re-assess ${recheck} obligation${recheck > 1 ? "s" : ""}`, urgent: true, href };
  const unassessed = active.filter((o) => o.status === "NOT_ASSESSED").length;
  if (unassessed) return { label: `Assess ${unassessed} obligation${unassessed > 1 ? "s" : ""}`, urgent: isReviewer, href };
  const open = active.filter((o) => o.status === "GAP" || o.status === "PARTIAL").length;
  if (open) return { label: `${open} roadmap action${open > 1 ? "s" : ""}`, urgent: false, href: `${base}/roadmap` };
  return null;
}

export function effectiveOf(system: Sys): Outputs | null {
  return (system.classifications[0]?.effective as Outputs | undefined) ?? null;
}
