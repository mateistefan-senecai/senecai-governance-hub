// Structural checks run before a content version can be published. A rule
// that points at a question id that no longer exists would silently stop
// firing, which for legal content is worse than a crash — so it is refused.

import { allQuestions } from "./engine";
import { SYSTEM_FACT_FIELDS, type Condition, type ContentBundle, type Questionnaire } from "./types";

const PARTIES = new Set(["provider", "deployer", "importer", "distributor"]);

export function validateBundle(bundle: ContentBundle): string[] {
  const errors: string[] = [];
  checkQuestionnaire(bundle.applicability, errors);
  checkQuestionnaire(bundle.classification, errors);

  // Facts answered from the AI system record: one question per field, and a
  // sector may only suggest an area of use that exists.
  const fields = new Set<string>();
  for (const question of allQuestions(bundle.classification)) {
    if (!question.fromSystem) continue;
    if (!SYSTEM_FACT_FIELDS.includes(question.fromSystem)) errors.push(`classification question ${question.id}: unknown system field "${question.fromSystem}"`);
    if (fields.has(question.fromSystem)) errors.push(`classification: two questions read system field "${question.fromSystem}"`);
    fields.add(question.fromSystem);
  }
  const areaIds = new Set(allQuestions(bundle.classification).find((x) => x.fromSystem === "areas")?.options?.map((o) => o.id) ?? []);
  for (const question of allQuestions(bundle.applicability)) {
    for (const o of question.options ?? []) {
      if (o.suggestsArea && !areaIds.has(o.suggestsArea)) errors.push(`applicability option ${question.id}/${o.id}: suggests unknown area "${o.suggestsArea}"`);
    }
  }

  const outputs = new Set(Object.keys(bundle.classification.defaults));
  const keys = new Set<string>();
  for (const ob of bundle.obligations) {
    const where = `obligation ${ob.key}`;
    if (keys.has(ob.key)) errors.push(`${where}: duplicate key`);
    keys.add(ob.key);
    for (const p of ob.parties) if (!PARTIES.has(p)) errors.push(`${where}: unknown party "${p}"`);
    if (ob.appliesFrom !== "highRisk" && !bundle.dates[ob.appliesFrom]) {
      errors.push(`${where}: unknown date key "${ob.appliesFrom}"`);
    }
    if (!ob.evidenceExpected.length) errors.push(`${where}: no expected evidence listed`);
    checkCondition(ob.when, where, new Map(), outputs, errors, true);
  }
  for (const doc of bundle.vendorDocuments) {
    if (doc.when) checkCondition(doc.when, `vendor document ${doc.kind}`, new Map(), outputs, errors, true);
  }
  for (const [key, d] of Object.entries(bundle.dates)) {
    if (Number.isNaN(Date.parse(d.date))) errors.push(`date ${key}: invalid date "${d.date}"`);
  }
  return errors;
}

function checkQuestionnaire(q: Questionnaire, errors: string[]) {
  const questions = new Map<string, Set<string> | null>();
  for (const question of allQuestions(q)) {
    if (questions.has(question.id)) errors.push(`${q.id}: duplicate question id "${question.id}"`);
    const isChoice = question.type === "single" || question.type === "multi";
    if (isChoice && !question.options?.length) errors.push(`${q.id}: question "${question.id}" has no options`);
    if (question.type === "text") questions.set(question.id, new Set());
    else questions.set(question.id, isChoice ? new Set(question.options!.map((o) => o.id)) : null);
  }
  // A free-text answer is never used by a rule (only shown): legal outcomes
  // come from closed answers.
  const textIds = new Set(allQuestions(q).filter((x) => x.type === "text").map((x) => x.id));
  const outputs = new Set(Object.keys(q.defaults));
  for (const question of allQuestions(q)) {
    if (question.showIf) checkCondition(question.showIf, `${q.id} question ${question.id}`, questions, outputs, errors, false);
    for (const o of question.options ?? []) {
      if (o.showIf) checkCondition(o.showIf, `${q.id} question ${question.id} option ${o.id}`, questions, outputs, errors, false);
    }
  }
  for (const rule of q.rules) {
    for (const id of conditionQuestions(rule.when)) {
      if (textIds.has(id)) errors.push(`${q.id} rule ${rule.id}: uses the free-text answer "${id}"`);
    }
  }
  const ruleIds = new Set<string>();
  for (const rule of q.rules) {
    const where = `${q.id} rule ${rule.id}`;
    if (ruleIds.has(rule.id)) errors.push(`${where}: duplicate rule id`);
    ruleIds.add(rule.id);
    if (!rule.citation) errors.push(`${where}: missing citation`);
    checkCondition(rule.when, where, questions, outputs, errors, false);
    for (const key of [...Object.keys(rule.set ?? {}), ...Object.keys(rule.add ?? {})]) {
      if (!outputs.has(key)) errors.push(`${where}: writes unknown output "${key}" (add it to defaults)`);
    }
  }
}

function checkCondition(
  cond: Condition,
  where: string,
  questions: Map<string, Set<string> | null>,
  outputs: Set<string>,
  errors: string[],
  outputsOnly: boolean,
) {
  if ("all" in cond) return cond.all.forEach((c) => checkCondition(c, where, questions, outputs, errors, outputsOnly));
  if ("any" in cond) return cond.any.forEach((c) => checkCondition(c, where, questions, outputs, errors, outputsOnly));
  if ("not" in cond) return checkCondition(cond.not, where, questions, outputs, errors, outputsOnly);

  const known = new Set(["q", "out", "is", "in", "has", "hasAny", "hasPrefix"]);
  for (const k of Object.keys(cond)) if (!known.has(k)) errors.push(`${where}: unknown condition key "${k}"`);

  if ("out" in cond) {
    if (!outputs.has(cond.out)) errors.push(`${where}: unknown output "${cond.out}"`);
    return;
  }
  if (outputsOnly) {
    errors.push(`${where}: may only test outputs, not answers ("${cond.q}")`);
    return;
  }
  if (!questions.has(cond.q)) {
    errors.push(`${where}: unknown question "${cond.q}"`);
    return;
  }
  const options = questions.get(cond.q);
  const referenced =
    "has" in cond ? [cond.has] : "hasAny" in cond ? cond.hasAny : "in" in cond ? cond.in : "is" in cond && typeof cond.is === "string" ? [cond.is] : [];
  if (options) {
    for (const v of referenced) if (!options.has(v)) errors.push(`${where}: "${cond.q}" has no option "${v}"`);
  } else if ("is" in cond && typeof cond.is !== "boolean") {
    errors.push(`${where}: "${cond.q}" is a yes/no question but is compared with "${cond.is}"`);
  }
}

function conditionQuestions(cond: Condition): string[] {
  if ("all" in cond) return cond.all.flatMap(conditionQuestions);
  if ("any" in cond) return cond.any.flatMap(conditionQuestions);
  if ("not" in cond) return conditionQuestions(cond.not);
  return "q" in cond ? [cond.q] : [];
}
