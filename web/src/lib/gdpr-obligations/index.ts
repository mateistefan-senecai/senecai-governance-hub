import type { GdprCharacteristic } from "@/generated/prisma/enums";
import catalogJson from "./catalog.json";
import type { GdprObligation } from "./types";

export type { GdprObligation, GdprObligationCategory, GdprObligationPlanItem } from "./types";

export const gdprObligationCatalog: GdprObligation[] = catalogJson as GdprObligation[];

export function getGdprObligation(id: string): GdprObligation {
  const obligation = gdprObligationCatalog.find((o) => o.id === id);
  if (!obligation) throw new Error(`Unknown GDPR obligation "${id}"`);
  return obligation;
}

/**
 * Which TIED obligations apply to a processing activity, given its
 * characteristics tags. Pure lookup over `requiresTagGroups` — adding or
 * changing an obligation never touches this function, same "rules as data"
 * principle as the AI Act module's `getApplicableObligations`.
 */
export function getApplicableGdprObligations(activity: {
  characteristics: GdprCharacteristic[];
}): GdprObligation[] {
  const tags = new Set(activity.characteristics);
  return gdprObligationCatalog.filter((o) => {
    if (o.category !== "TIED") return false;
    if (!o.requiresTagGroups || o.requiresTagGroups.length === 0) return true;
    return o.requiresTagGroups.some((group) => group.every((tag) => tags.has(tag)));
  });
}

/**
 * GENERAL catalog obligations (ROPA, security, breach response, DSR
 * procedure, DPO assessment, ...) — apply org-wide once any processing
 * activity exists, tracked once per organization rather than duplicated
 * across every activity's own screens (mirrors getGeneralObligations).
 */
export function getGeneralGdprObligations(): GdprObligation[] {
  return gdprObligationCatalog.filter((o) => o.category === "GENERAL");
}

/** Duplicate/malformed catalog entries — hook for the validate script. */
export function validateGdprCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const o of gdprObligationCatalog) {
    if (seen.has(o.id)) errors.push(`Duplicate GDPR obligation id "${o.id}"`);
    seen.add(o.id);
    if (!o.title.trim()) errors.push(`GDPR obligation "${o.id}" has an empty title`);
    if (!o.citation.trim()) errors.push(`GDPR obligation "${o.id}" has an empty citation`);
    if (!o.description.trim()) errors.push(`GDPR obligation "${o.id}" has an empty description`);
  }
  return errors;
}
