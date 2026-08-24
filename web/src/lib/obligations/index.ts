import type { LegalRole, RiskClassification } from "@/generated/prisma/enums";
import catalogJson from "./catalog.json";
import type { Obligation } from "./types";

export type { Obligation, ObligationCategory } from "./types";

export const obligationCatalog: Obligation[] = catalogJson as Obligation[];

export function getObligation(id: string): Obligation {
  const obligation = obligationCatalog.find((o) => o.id === id);
  if (!obligation) throw new Error(`Unknown obligation "${id}"`);
  return obligation;
}

/**
 * Which obligations apply to a system specifically, given its Module 1
 * outputs. Pure lookup over `category` — adding/changing an obligation
 * never touches this function, matching the "rules as data" principle.
 *
 * GENERAL obligations are deliberately excluded here — they apply to the
 * organization as a whole regardless of any one system's classification,
 * so they're tracked once per org (see `getGeneralObligations` and
 * `OrganizationObligationAssessment`) instead of being duplicated onto
 * every system's own obligations/gap/plan screens.
 *
 * NOTE: importer / distributor / downstream-provider high-risk obligations
 * (Art. 23-25) aren't mapped yet — the concept note's Feature 2.1 only calls
 * out provider high-risk and deployer high-risk obligation sets.
 */
export function getApplicableObligations(system: {
  legalRole: LegalRole | null;
  riskClassification: RiskClassification | null;
}): Obligation[] {
  const { legalRole, riskClassification } = system;
  if (!legalRole || !riskClassification) return [];
  if (riskClassification === "OUT_OF_SCOPE" || riskClassification === "PROHIBITED") return [];
  if (riskClassification !== "HIGH_RISK") return [];

  const applicable: Obligation[] = [];
  if (legalRole === "PROVIDER" || legalRole === "BOTH") {
    applicable.push(...obligationCatalog.filter((o) => o.category === "PROVIDER_HIGH_RISK"));
  }
  if (legalRole === "DEPLOYER" || legalRole === "BOTH") {
    applicable.push(...obligationCatalog.filter((o) => o.category === "DEPLOYER_HIGH_RISK"));
  }

  return applicable;
}

/**
 * GENERAL catalog obligations (AI literacy, internal governance policy,
 * transparency) — these apply to every in-scope organization regardless of
 * any individual system's role or risk classification, so they're surfaced
 * at the org level (Overview) rather than per system.
 */
export function getGeneralObligations(): Obligation[] {
  return obligationCatalog.filter((o) => o.category === "GENERAL");
}

/** Duplicate/malformed catalog entries — hook for the validate script. */
export function validateCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const o of obligationCatalog) {
    if (seen.has(o.id)) errors.push(`Duplicate obligation id "${o.id}"`);
    seen.add(o.id);
    if (!o.title.trim()) errors.push(`Obligation "${o.id}" has an empty title`);
    if (!o.citation.trim()) errors.push(`Obligation "${o.id}" has an empty citation`);
    if (!o.description.trim()) errors.push(`Obligation "${o.id}" has an empty description`);
  }
  return errors;
}
