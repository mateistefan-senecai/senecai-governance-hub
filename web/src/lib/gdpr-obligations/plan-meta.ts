// Module-2-only presentation metadata, kept separate from catalog.json so
// that file stays focused on the category/tag-gating lookup principle
// described in its own header comment — mirrors obligations/plan-meta.ts.

/**
 * The DPIA obligation gets an "Open DPIA →" link to its dedicated sub-page
 * instead of the generic status control — see gdpr spec Section 5.
 */
export const DPIA_OBLIGATION_ID = "tied.art35-dpia";

/** Obligations with a "Generate dossier"-style action on the Obligations screen. */
export const DOSSIER_OBLIGATION_IDS = new Set<string>(["general.art30-ropa"]);

/** Obligations whose action-plan item is flagged "Expert review required". */
export const EXPERT_REVIEW_OBLIGATION_IDS = new Set<string>([
  "general.art37-dpo",
  "general.art33-34-breach-response",
  "tied.art9-special-category-basis",
  "tied.art35-dpia",
  "tied.art44-49-transfer-safeguards",
  "tied.art6-1f-lia",
  "tied.art26-joint-controller-arrangement",
]);
