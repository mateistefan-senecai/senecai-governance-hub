// Step 1 → step 2. The structured fields of an AI system record answer the
// classification's "facts" questions, so the questionnaire only asks what the
// record cannot settle. The record is authoritative: these answers replace
// anything submitted for the same questions.

import { allQuestions } from "./engine";
import type { Answers, Option, Question, Questionnaire, SystemFactField } from "./types";

export type SystemFacts = Partial<Record<SystemFactField, string | string[]>>;

export function factQuestions(q: Questionnaire): Question[] {
  return allQuestions(q).filter((x) => x.fromSystem);
}

export function factQuestion(q: Questionnaire, field: SystemFactField): Question | undefined {
  return allQuestions(q).find((x) => x.fromSystem === field);
}

/** The answers a system record gives to the classification. */
export function systemAnswers(q: Questionnaire, system: SystemFacts): Answers {
  const answers: Answers = {};
  for (const question of factQuestions(q)) {
    const value = system[question.fromSystem!];
    if (value === undefined || value === null) continue;
    answers[question.id] = Array.isArray(value) ? value : value.toLowerCase();
  }
  return answers;
}

/** True when the record still lacks a fact the classification needs (e.g. systems added before the facts existed). */
export function missingFacts(q: Questionnaire, system: SystemFacts): Question[] {
  return factQuestions(q).filter((question) => {
    const value = system[question.fromSystem!];
    if (question.type === "multi") return !question.optional && (!Array.isArray(value) || value.length === 0);
    return !value;
  });
}

/** Labels of the chosen options, for the "taken from the system record" summary. */
export function factLabels(question: Question, value: string | string[] | undefined): string[] {
  const ids = Array.isArray(value) ? value : value ? [value.toLowerCase()] : [];
  return ids.map((id) => question.options?.find((o: Option) => o.id === id)?.label ?? id);
}

/** Ids in a system record's fact lists that the content library does not offer. */
export function unknownFactValues(q: Questionnaire, system: SystemFacts): string[] {
  const bad: string[] = [];
  for (const field of ["areas", "affectedGroups", "capabilities"] as const) {
    const question = factQuestion(q, field);
    const allowed = new Set(question?.options?.map((o) => o.id) ?? []);
    for (const v of (system[field] as string[] | undefined) ?? []) if (!allowed.has(v)) bad.push(`${field}:${v}`);
  }
  return bad;
}

/** The three tick-box questions the system form shows. */
export function systemFormFacts(q: Questionnaire) {
  const get = (f: SystemFactField) => {
    const question = factQuestion(q, f);
    if (!question) throw new Error(`Content has no question for system field "${f}"`);
    return question;
  };
  return { areas: get("areas"), affectedGroups: get("affectedGroups"), capabilities: get("capabilities") };
}

/** Areas a new system starts with, from the client's sector in the applicability check. */
export function suggestedAreas(applicability: Questionnaire, answers: Answers | null | undefined): string[] {
  const sector = answers?.["co.sector"];
  if (typeof sector !== "string") return [];
  const option = allQuestions(applicability).find((x) => x.id === "co.sector")?.options?.find((o) => o.id === sector);
  return option?.suggestsArea ? [option.suggestsArea] : [];
}
