// Shapes of the legal content library (content/ai-act/*.json). Legal content
// is data: questionnaires, rules, obligations and dates live in JSON that the
// spec owner edits, and is published as a numbered ContentVersion. Nothing in
// this file knows about any particular article of the AI Act.

export type AnswerValue = boolean | string | string[];
export type Answers = Record<string, AnswerValue>;
export type OutputValue = boolean | string | string[] | Record<string, unknown>[];
export type Outputs = Record<string, OutputValue>;

/** A test over answers (`q`) or over outputs computed so far (`out`). */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { q: string; is: boolean | string }
  | { q: string; in: string[] }
  | { q: string; has: string }
  | { q: string; hasAny: string[] }
  | { out: string; is: boolean | string }
  | { out: string; has: string }
  | { out: string; hasAny: string[] }
  | { out: string; hasPrefix: string };

export type Option = {
  id: string;
  label: string;
  help?: string;
  citation?: string;
  /** Offer this option only when this holds (e.g. Annex III points for the areas the system is used in). */
  showIf?: Condition;
  /** Applicability sector options: the area of use (an option of `use.areas`) a new system starts with. */
  suggestsArea?: string;
  /** "None of these": ticking it clears the other options of a multi question, and ticking another clears it. */
  exclusive?: boolean;
};

/** AI system fields (step 1) that answer a classification question directly. */
export const SYSTEM_FACT_FIELDS = ["origin", "useType", "stage", "areas", "affectedGroups", "capabilities"] as const;
export type SystemFactField = (typeof SYSTEM_FACT_FIELDS)[number];

export type Question = {
  id: string;
  text: string;
  help?: string;
  citation?: string;
  /** "text" is a free answer: stored and shown, but never used by a rule. */
  type: "boolean" | "single" | "multi" | "text";
  options?: Option[];
  /** Ask only when this holds. Hidden questions are dropped from the answers. */
  showIf?: Condition;
  /**
   * Multi questions may be left empty when optional. A required multi question
   * needs at least one tick: offer an `exclusive` "None of these" option, so
   * that "none applies" is a deliberate answer and not an oversight.
   */
  optional?: boolean;
  /**
   * Answered from this field of the AI system record (step 1) instead of
   * being asked. Enum values are lower-cased to match the option ids.
   */
  fromSystem?: SystemFactField;
};

export type Section = { id: string; title: string; intro?: string; questions: Question[] };

/**
 * Evaluated in order. A rule that fires sets or appends outputs and is
 * recorded, with its citation and rationale, in the reasoning trail — that
 * trail is what the reviewer and the PDF show as "why".
 */
export type Rule = {
  id: string;
  when: Condition;
  set?: Record<string, boolean | string>;
  add?: Record<string, string | Record<string, unknown>>;
  citation: string;
  rationale: string;
  /** Rules marked silent change outputs without appearing in the trail (bookkeeping). */
  silent?: boolean;
};

export type Questionnaire = {
  id: string;
  title: string;
  sections: Section[];
  defaults: Outputs;
  rules: Rule[];
};

export type Firing = { ruleId: string; citation: string; rationale: string };

export type Evaluation = { outputs: Outputs; reasoning: Firing[] };

export type Party = "provider" | "deployer" | "importer" | "distributor";

export type ObligationDef = {
  key: string;
  article: string;
  title: string;
  /** Plain-language description of what the duty requires. */
  summary: string;
  parties: Party[];
  /** Test over the effective classification outputs. */
  when: Condition;
  /** Key into `dates`, or "highRisk" to pick the Annex I / Annex III date. */
  appliesFrom: string;
  appliesBecause: string;
  action: { title: string; type: "LEGAL" | "TECHNICAL"; effort: "S" | "M" | "L" };
  evidenceExpected: string[];
  /**
   * "company": a duty of the company as a whole (e.g. AI literacy, Art. 4).
   * It is recorded once per client, applying while at least one of its
   * systems' classifications selects it. Omitted: one record per system.
   */
  level?: "company";
  /** Longer explanation for practitioners ("Understand this obligation better"). */
  explainer?: Explainer;
};

/**
 * A practitioner's explanation of an obligation: what it requires in detail,
 * how to meet it and which guidance it draws on. Points may mark key words
 * with **bold**. Guidance cited here is non-binding; the obligation itself
 * comes from the Act.
 */
export type Explainer = {
  intro: string;
  sections: { heading: string; points: string[] }[];
  sources: { label: string; url: string; note?: string }[];
  /** ISO date the explanation was last checked against its sources. */
  checked: string;
};

export type DateDef = { date: string; provision: string; label: string; note?: string };

export type VendorDocDef = {
  kind: string;
  label: string;
  citation: string;
  /** Request only when this holds over the classification; omitted = always. */
  when?: Condition;
};

export type ContentBundle = {
  version: string;
  status: "DRAFT" | "PUBLISHED";
  notes: string;
  applicability: Questionnaire;
  classification: Questionnaire;
  obligations: ObligationDef[];
  dates: Record<string, DateDef>;
  vendorDocuments: VendorDocDef[];
};
