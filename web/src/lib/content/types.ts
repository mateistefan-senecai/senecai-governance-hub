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

export type Option = { id: string; label: string; help?: string; citation?: string };

export type Question = {
  id: string;
  text: string;
  help?: string;
  citation?: string;
  type: "boolean" | "single" | "multi";
  options?: Option[];
  /** Ask only when this holds. Hidden questions are dropped from the answers. */
  showIf?: Condition;
  /** Multi questions may be left empty ("none of these"); others are required. */
  optional?: boolean;
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
