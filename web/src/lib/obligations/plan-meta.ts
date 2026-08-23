// Module-2-only presentation metadata, kept separate from catalog.json so
// that file stays focused on the category-lookup principle described in
// its own header comment.

/** Obligations with a "Generate dossier" action on the Obligations screen. */
export const DOSSIER_OBLIGATION_IDS = new Set<string>([
  "provider-hr.art11-technical-documentation",
  "provider-hr.art13-transparency-to-deployers",
  "provider-hr.art47-declaration-of-conformity",
  "deployer-hr.art27-fria",
]);

/** Obligations whose action-plan item is flagged "Expert review required". */
export const EXPERT_REVIEW_OBLIGATION_IDS = new Set<string>([
  "provider-hr.art9-risk-management",
  "provider-hr.art11-technical-documentation",
  "provider-hr.art43-conformity-assessment",
  "provider-hr.art47-declaration-of-conformity",
  "deployer-hr.art27-fria",
]);
