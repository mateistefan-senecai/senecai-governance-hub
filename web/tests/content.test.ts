// Scenario tests for the legal content: realistic systems and the outcome a
// lawyer expects. If a content edit changes one of these outcomes, the test
// fails and the change must be deliberate.
//
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { applicableObligations, evaluate, missingAnswers, pruneAnswers, visibleOptions, visibleQuestions } from "../src/lib/content/engine";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { validateBundle } from "../src/lib/content/validate";
import type { Answers, ContentBundle } from "../src/lib/content/types";

const bundle = loadBundleFromDisk();

const NO_ROLE: Answers = {
  "role.develops": false,
  "role.integrates": false,
  "role.rebrands": false,
  "role.modifies": false,
  "role.repurposes": false,
  "role.uses": false,
  "role.imports": false,
  "role.distributes": false,
};
const NO_TRANSPARENCY: Answers = { "t.interacts": false, "t.generates": false };
// Nothing flagged in the prohibited-practice risk screen.
const NO_PROHIBITED_RISK: Answers = {
  "p.influence": false, "p.vulnerable": false, "p.scoring": false, "p.crime": false, "p.faces": false,
  "p.emotions": false, "p.biocat": false, "p.rbi": false, "p.synthetic": false,
};

/** Defaults to the "other" area, which keeps every question and option on offer. */
function classify(answers: Answers) {
  const all = {
    "use.areas": ["other"], ...NO_ROLE, "role.workplace": false, ...NO_TRANSPARENCY, ...NO_PROHIBITED_RISK,
    "scope.exclusions": [], "hr.annexI": [], "hr.annexIII": [], ...answers,
  };
  const { outputs, reasoning } = evaluate(bundle.classification, all);
  const obligations = applicableObligations(bundle, outputs).map((o) => o.def.key);
  return { outputs, reasoning, obligations, missing: missingAnswers(bundle.classification, all) };
}

test("content library is structurally valid", () => {
  assert.deepEqual(validateBundle(bundle), []);
});

test("validator rejects a rule pointing at a question that does not exist", () => {
  const broken: ContentBundle = structuredClone(bundle);
  broken.classification.rules[0].when = { q: "role.doesNotExist", is: true };
  assert.match(validateBundle(broken).join("\n"), /unknown question "role\.doesNotExist"/);
});

test("in-house credit scoring: provider and deployer, high-risk under Annex III 5(b), FRIA applies", () => {
  const r = classify({
    "role.develops": true,
    "role.uses": true,
    "role.publicBody": false,
    "hr.annexIII": ["5b"],
    "hr.profiling": true,
  });
  assert.deepEqual(r.missing, []);
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  assert.deepEqual(r.outputs.roles, ["provider", "deployer"]);
  for (const key of ["art9.riskManagement", "art11.technicalDocumentation", "art49_1.registration", "art26_6.logs", "art27.fria", "art4.literacy"]) {
    assert.ok(r.obligations.includes(key), `expected ${key}`);
  }
  assert.ok(r.reasoning.some((f) => f.citation === "Art. 6(3), last subparagraph"), "profiling rule is in the trail");
  assert.ok(!r.obligations.includes("art26_1.useInstructions"), "Art. 26(1) is covered by the provider duties");
  assert.ok(r.reasoning.some((f) => f.ruleId === "role.providerAndDeployer"), "and the trail says why");
});

test("bought CV screening tool used as-is: deployer only, no provider duties, no FRIA", () => {
  const r = classify({ "role.uses": true, "role.publicBody": false, "hr.annexIII": ["4a"], "hr.profiling": true });
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  assert.deepEqual(r.outputs.roles, ["deployer"]);
  assert.ok(r.obligations.includes("art26_1.useInstructions"));
  assert.ok(!r.obligations.includes("art26_7.workers"), "candidates are not the company's workers");
  assert.ok(!r.obligations.includes("art9.riskManagement"));
  assert.ok(!r.obligations.includes("art27.fria"));
});

test("public body deploying an Annex III system must do a FRIA and register the use", () => {
  const r = classify({ "role.uses": true, "role.publicBody": true, "hr.annexIII": ["5a"], "hr.profiling": false, "hr.derogation": [] });
  assert.ok(r.obligations.includes("art27.fria"));
  assert.ok(r.obligations.includes("art49_3.registration"));
});

test("deployer of a third-party chatbot: limited risk, but Art. 50(1) is the provider's duty", () => {
  const r = classify({ "role.uses": true, "role.publicBody": false, "t.interacts": true });
  assert.equal(r.outputs.riskClass, "LIMITED");
  assert.deepEqual(r.obligations, ["art4.literacy"]);
});

test("provider of a chatbot that generates text must disclose and mark output", () => {
  const r = classify({ "role.develops": true, "t.interacts": true, "t.generates": true, "t.deepfake": false, "t.publicText": false });
  assert.equal(r.outputs.riskClass, "LIMITED");
  assert.ok(r.obligations.includes("art50_1.interaction"));
  assert.ok(r.obligations.includes("art50_2.marking"));
});

test("Art. 6(3) derogation without profiling: not high-risk, provider must document and register", () => {
  const r = classify({ "role.develops": true, "hr.annexIII": ["4a"], "hr.profiling": false, "hr.derogation": ["d"] });
  assert.equal(r.outputs.highRisk, false);
  assert.equal(r.outputs.art6_3Exempt, true);
  assert.equal(r.outputs.riskClass, "MINIMAL");
  assert.ok(r.obligations.includes("art6_4.notHighRiskAssessment"));
  assert.ok(!r.obligations.includes("art9.riskManagement"));
});

test("derogation answers are ignored when the system profiles (question hidden)", () => {
  const r = classify({ "role.develops": true, "hr.annexIII": ["4a"], "hr.profiling": true, "hr.derogation": ["d"] });
  assert.equal(r.outputs.highRisk, true);
  assert.equal(r.outputs.art6_3Exempt, false);
});

test("Art. 26(7) applies only when the system affects the company's own workers", () => {
  const atWork = classify({ "role.uses": true, "role.workplace": true, "role.publicBody": false, "hr.annexIII": ["4b"], "hr.profiling": true });
  assert.ok(atWork.obligations.includes("art26_7.workers"));
});

test("emotion inference at work, not for medical or safety reasons, is flagged as a prohibited-practice risk", () => {
  const r = classify({
    "role.uses": true, "role.publicBody": false,
    "p.emotions": true, "p.emotionsWhere": ["workplace"], "p.emotionsMedical": false,
  });
  assert.equal(r.outputs.riskClass, "PROHIBITED");
  assert.deepEqual(r.outputs.prohibitedPractices, ["Art. 5(1)(f)"]);
  assert.ok(r.obligations.includes("art5.cease"));
  assert.ok((r.outputs.attention as string[]).some((a) => a.includes("Art. 5(1)(f)")), "the reviewer is asked to assess it");
  assert.ok((r.outputs.transparency as string[]).includes("50(3)"), "emotion recognition also triggers Art. 50(3)");
});

test("emotion inference for safety reasons is not flagged", () => {
  const r = classify({ "role.uses": true, "role.publicBody": false, "p.emotions": true, "p.emotionsWhere": ["workplace"], "p.emotionsMedical": true });
  assert.equal(r.outputs.prohibited, false);
});

test("an ed-tech teaching assistant is not asked about law enforcement or product safety", () => {
  const answers: Answers = {
    "use.areas": ["education"], ...NO_ROLE, "role.develops": true, ...NO_TRANSPARENCY, ...NO_PROHIBITED_RISK,
    "scope.exclusions": [], "hr.annexIII": ["3b", "6"], "hr.profiling": true,
  };
  const pruned = pruneAnswers(bundle.classification, answers);
  const asked = new Set(visibleQuestions(bundle.classification, pruned).map((q) => q.id));
  for (const id of ["hr.annexI", "p.crime", "p.rbi", "p.faces", "p.biocat"]) assert.ok(!asked.has(id), `${id} should not be asked`);
  const annexIII = bundle.classification.sections.flatMap((s) => s.questions).find((q) => q.id === "hr.annexIII")!;
  assert.deepEqual(visibleOptions(annexIII, pruned).map((o) => o.id), ["3a", "3b", "3c", "3d"]);
  assert.deepEqual(pruned["hr.annexIII"], ["3b"], "an option that is not offered is dropped");
  assert.deepEqual(missingAnswers(bundle.classification, pruned), []);
  const r = evaluate(bundle.classification, answers);
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
});

test("pure research is out of scope and nothing else is asked or applies", () => {
  const r = classify({ "role.develops": true, "scope.exclusions": ["research"], "hr.annexIII": ["4a"], "t.interacts": true });
  assert.equal(r.outputs.riskClass, "OUT_OF_SCOPE");
  assert.deepEqual(r.obligations, []);
});

test("Annex I medical device with notified body: high-risk with the Annex I date", () => {
  const r = classify({ "role.develops": true, "hr.annexI": ["medical"], "hr.thirdPartyAssessment": true });
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  const art9 = applicableObligations(bundle, r.outputs).find((o) => o.def.key === "art9.riskManagement");
  assert.equal(art9?.appliesFrom, bundle.dates.highRiskAnnexI.date);
});

test("Digital Omnibus: machinery is Annex I Section B, high-risk but without separate AI Act high-risk obligations", () => {
  const r = classify({ "use.areas": ["product"], "role.develops": true, "hr.annexI": ["machinery"], "hr.thirdPartyAssessment": true });
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  assert.equal(r.outputs.highRisk, false);
  assert.ok(!r.obligations.includes("art9.riskManagement"));
  assert.ok(r.obligations.includes("art4.literacy"));
  assert.ok((r.outputs.attention as string[]).some((a) => a.includes("Section B")));
});

test("Digital Omnibus: high-risk dates are 2 December 2027 (Annex III) and 2 August 2028 (Annex I)", () => {
  assert.equal(bundle.dates.highRiskAnnexIII.date, "2027-12-02");
  assert.equal(bundle.dates.highRiskAnnexI.date, "2028-08-02");
});

test("Digital Omnibus: a generator of non-consensual intimate content is flagged under Art. 5(1)(ba)–(bb)", () => {
  const r = classify({ "role.develops": true, "p.synthetic": true, "p.intimate": true });
  assert.equal(r.outputs.riskClass, "PROHIBITED");
  assert.deepEqual(r.outputs.prohibitedPractices, ["Art. 5(1)(ba)–(bb)"]);
});

test("applicability: EU company using AI is in scope; non-EU company with no EU output is not", () => {
  const inScope = evaluate(bundle.applicability, {
    "co.establishedInEU": true, "co.size": "medium", "co.sector": "finance",
    "ai.builds": false, "ai.uses": true, "ai.importsOrDistributes": false, "data.personal": true,
  });
  assert.equal(inScope.outputs.aiActApplies, true);
  const regs = (inScope.outputs.findings as { regulation: string }[]).map((f) => f.regulation);
  assert.deepEqual(regs, ["AI_ACT", "GDPR"], "DORA, NIS2 and CRA are out of scope for this version");

  const outOfScope = evaluate(bundle.applicability, {
    "co.establishedInEU": false, "co.size": "small", "co.sector": "retail",
    "ai.builds": false, "ai.uses": true, "ai.outputUsedInEU": false, "ai.importsOrDistributes": false, "data.personal": false,
  });
  assert.equal(outOfScope.outputs.aiActApplies, false);
});
