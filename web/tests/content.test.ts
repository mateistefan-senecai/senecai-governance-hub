// Scenario tests for the legal content: realistic systems and the outcome a
// lawyer expects. If a content edit changes one of these outcomes, the test
// fails and the change must be deliberate.
//
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { applicableObligations, evaluate, missingAnswers } from "../src/lib/content/engine";
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
const NO_TRANSPARENCY: Answers = { "t.interacts": false, "t.generates": false, "t.emotionOrBiometric": false };

function classify(answers: Answers) {
  const all = { ...NO_ROLE, ...NO_TRANSPARENCY, "scope.exclusions": [], "prohibited.practices": [], "hr.annexI": [], "hr.annexIII": [], ...answers };
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
});

test("bought CV screening tool used as-is: deployer only, no provider duties, no FRIA", () => {
  const r = classify({ "role.uses": true, "role.publicBody": false, "hr.annexIII": ["4a"], "hr.profiling": true });
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  assert.deepEqual(r.outputs.roles, ["deployer"]);
  assert.ok(r.obligations.includes("art26_7.workers"));
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

test("emotion recognition at work is prohibited", () => {
  const r = classify({ "role.uses": true, "role.publicBody": false, "prohibited.practices": ["f"] });
  assert.equal(r.outputs.riskClass, "PROHIBITED");
  assert.ok(r.obligations.includes("art5.cease"));
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

test("applicability: EU company using AI is in scope; non-EU company with no EU output is not", () => {
  const inScope = evaluate(bundle.applicability, {
    "co.establishedInEU": true, "co.size": "medium", "co.sector": "finance",
    "ai.builds": false, "ai.uses": true, "ai.importsOrDistributes": false, "data.personal": true,
  });
  assert.equal(inScope.outputs.aiActApplies, true);
  const regs = (inScope.outputs.findings as { regulation: string }[]).map((f) => f.regulation);
  assert.deepEqual(regs, ["AI_ACT", "GDPR", "DORA", "NIS2"]);

  const outOfScope = evaluate(bundle.applicability, {
    "co.establishedInEU": false, "co.size": "small", "co.sector": "retail",
    "ai.builds": false, "ai.uses": true, "ai.outputUsedInEU": false, "ai.importsOrDistributes": false, "data.personal": false,
  });
  assert.equal(outOfScope.outputs.aiActApplies, false);
});
