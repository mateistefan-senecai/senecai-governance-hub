// Deterministic interpreter for the content library. Same answers + same
// content version → same result, every time. AI never decides anything here.

import type {
  Answers,
  Condition,
  ContentBundle,
  Evaluation,
  Firing,
  ObligationDef,
  Outputs,
  Party,
  Question,
  Questionnaire,
} from "./types";

export function test(cond: Condition, answers: Answers, outputs: Outputs): boolean {
  if ("all" in cond) return cond.all.every((c) => test(c, answers, outputs));
  if ("any" in cond) return cond.any.some((c) => test(c, answers, outputs));
  if ("not" in cond) return !test(cond.not, answers, outputs);

  const value = "q" in cond ? answers[cond.q] : outputs[cond.out];
  if ("is" in cond) return value === cond.is;
  if ("in" in cond) return typeof value === "string" && cond.in.includes(value);
  const list = Array.isArray(value) ? (value as unknown[]).filter((v) => typeof v === "string") : [];
  if ("has" in cond) return list.includes(cond.has);
  if ("hasAny" in cond) return cond.hasAny.some((v) => list.includes(v));
  if ("hasPrefix" in cond) return list.some((v) => (v as string).startsWith(cond.hasPrefix));
  return false;
}

export function allQuestions(q: Questionnaire): Question[] {
  return q.sections.flatMap((s) => s.questions);
}

/** Questions currently shown, given the answers so far. */
export function visibleQuestions(q: Questionnaire, answers: Answers): Question[] {
  return allQuestions(q).filter((question) => !question.showIf || test(question.showIf, answers, {}));
}

/** Drops answers to hidden questions so they cannot influence the rules. */
export function pruneAnswers(q: Questionnaire, answers: Answers): Answers {
  const visible = new Set(visibleQuestions(q, answers).map((x) => x.id));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => visible.has(id)));
}

/** Ids of visible, required questions without an answer. */
export function missingAnswers(q: Questionnaire, answers: Answers): string[] {
  return visibleQuestions(q, answers)
    .filter((question) => !question.optional && !(question.id in answers))
    .map((question) => question.id);
}

export function evaluate(q: Questionnaire, rawAnswers: Answers): Evaluation {
  const answers = pruneAnswers(q, rawAnswers);
  const outputs: Outputs = structuredClone(q.defaults);
  const reasoning: Firing[] = [];

  for (const rule of q.rules) {
    if (!test(rule.when, answers, outputs)) continue;
    for (const [key, value] of Object.entries(rule.set ?? {})) outputs[key] = value;
    for (const [key, value] of Object.entries(rule.add ?? {})) {
      const current = Array.isArray(outputs[key]) ? (outputs[key] as unknown[]) : [];
      const isDuplicate = typeof value === "string" && current.includes(value);
      if (!isDuplicate) outputs[key] = [...current, value] as Outputs[string];
    }
    if (!rule.silent) reasoning.push({ ruleId: rule.id, citation: rule.citation, rationale: rule.rationale });
  }
  return { outputs, reasoning };
}

export type ApplicableObligation = {
  def: ObligationDef;
  party: string;
  appliesFrom: string | null;
};

/** Selects obligations from the library for one system's effective classification. */
export function applicableObligations(bundle: ContentBundle, outputs: Outputs): ApplicableObligation[] {
  const roles = (Array.isArray(outputs.roles) ? outputs.roles : []) as Party[];
  return bundle.obligations
    .filter((def) => def.parties.some((p) => roles.includes(p)) && test(def.when, {}, outputs))
    .map((def) => ({
      def,
      party: def.parties.filter((p) => roles.includes(p)).join(" & "),
      appliesFrom: resolveDate(bundle, def.appliesFrom, outputs),
    }));
}

/**
 * "highRisk" resolves to the Annex III date when any Annex III point applies
 * and to the Annex I date otherwise — the two have different application
 * dates (Art. 113).
 */
export function resolveDateKey(key: string, outputs: Outputs): string {
  if (key !== "highRisk") return key;
  const basis = Array.isArray(outputs.highRiskBasis) ? (outputs.highRiskBasis as string[]) : [];
  return basis.some((b) => b.startsWith("annexIII")) ? "highRiskAnnexIII" : "highRiskAnnexI";
}

export function resolveDate(bundle: ContentBundle, key: string, outputs: Outputs): string | null {
  return bundle.dates[resolveDateKey(key, outputs)]?.date ?? null;
}
