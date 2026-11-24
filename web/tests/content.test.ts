// Scenario tests for the legal content: realistic systems and the outcome a
// lawyer expects. If a content edit changes one of these outcomes, the test
// fails and the change must be deliberate.
//
// Each system is described by its record (step 1: origin, use, stage, areas,
// affected groups, what it does) plus the few answers step 2 still asks.
//
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { applicableObligations, evaluate, missingAnswers, pruneAnswers, visibleOptions, visibleQuestions } from "../src/lib/content/engine";
import { suggestedAreas } from "../src/lib/content/facts";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { validateBundle } from "../src/lib/content/validate";
import type { Answers, ContentBundle } from "../src/lib/content/types";

const bundle = loadBundleFromDisk();

type Facts = { origin?: string; use?: string; stage?: string; areas?: string[]; affected?: string[]; does?: string[] };

function classify(facts: Facts, answers: Answers = {}) {
  const all: Answers = {
    "sys.origin": facts.origin ?? "built",
    "sys.use": facts.use ?? "product",
    "sys.stage": facts.stage ?? "production",
    "use.areas": facts.areas ?? ["other"],
    "sys.affected": facts.affected ?? [],
    "sys.does": facts.does ?? [],
    "hr.annexIII": [],
    ...answers,
  };
  const pruned = pruneAnswers(bundle.classification, all);
  const { outputs, reasoning } = evaluate(bundle.classification, all);
  const obligations = applicableObligations(bundle, outputs).map((o) => o.def.key);
  const asked = visibleQuestions(bundle.classification, pruned).filter((q) => !q.fromSystem).map((q) => q.id);
  return { outputs, reasoning, obligations, asked, pruned, missing: missingAnswers(bundle.classification, pruned) };
}

const BOUGHT_AS_IS: Answers = { "role.rebrands": false, "role.modifies": false, "role.repurposes": false };

test("content library is structurally valid", () => {
  assert.deepEqual(validateBundle(bundle), []);
});

test("validator rejects a rule pointing at a question that does not exist", () => {
  const broken: ContentBundle = structuredClone(bundle);
  broken.classification.rules[0].when = { q: "role.doesNotExist", is: true };
  assert.match(validateBundle(broken).join("\n"), /unknown question "role\.doesNotExist"/);
});

test("the school chatbot an ed-tech company supplies: three questions, limited risk", () => {
  const r = classify(
    { origin: "built", use: "product", areas: ["education"], affected: ["students", "children"], does: ["chats", "generatesText"] },
    { "p.vulnerableExploit": false, "p.scoring": false },
  );
  assert.deepEqual(r.asked, ["p.vulnerableExploit", "p.scoring", "hr.annexIII"]);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.outputs.roles, ["provider"]);
  assert.equal(r.outputs.riskClass, "LIMITED");
  assert.deepEqual(r.obligations.sort(), ["art4.literacy", "art50_1.interaction", "art50_2.marking"]);
});

test("the role comes from origin and use; role questions are asked only for bought systems", () => {
  assert.deepEqual(classify({ origin: "built", use: "internal" }).outputs.roles, ["provider", "deployer"]);
  assert.deepEqual(classify({ origin: "embedded", use: "product" }).outputs.roles, ["provider"]);
  assert.ok(!classify({ origin: "built" }).asked.some((id) => id.startsWith("role.")));
  const resold = classify({ origin: "bought", use: "product" });
  for (const id of ["role.rebrands", "role.modifies", "role.repurposes", "role.imports", "role.distributes"]) assert.ok(resold.asked.includes(id), id);
  assert.ok(!classify({ origin: "bought", use: "internal" }).asked.includes("role.imports"));
});

test("in-house credit scoring: provider and deployer, high-risk under Annex III 5(b), FRIA applies", () => {
  const r = classify(
    { origin: "built", use: "internal", areas: ["finance"], affected: ["customers"], does: ["scores", "decides"] },
    { "role.publicBody": false, "hr.annexIII": ["5b"], "hr.profiling": true, "p.scoringUse": false },
  );
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

test("bought CV screening tool used as-is: deployer only, no provider duties, no FRIA, no Art. 26(7)", () => {
  const r = classify(
    { origin: "bought", use: "internal", areas: ["employment"], affected: ["candidates"], does: ["scores", "decides"] },
    { ...BOUGHT_AS_IS, "role.publicBody": false, "hr.annexIII": ["4a"], "hr.profiling": true, "p.scoringUse": false },
  );
  assert.deepEqual(r.missing, []);
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  assert.deepEqual(r.outputs.roles, ["deployer"]);
  assert.ok(r.obligations.includes("art26_1.useInstructions"));
  assert.ok(!r.obligations.includes("art26_7.workers"), "candidates are not the company's workers");
  assert.ok(!r.obligations.includes("art9.riskManagement"));
  assert.ok(!r.obligations.includes("art27.fria"));
});

test("Art. 26(7) applies when a high-risk system affects the company's own employees", () => {
  const r = classify(
    { origin: "bought", use: "internal", areas: ["employment"], affected: ["employees"], does: ["decides"] },
    { ...BOUGHT_AS_IS, "role.publicBody": false, "hr.annexIII": ["4b"], "hr.profiling": true, "p.scoring": false },
  );
  assert.ok(r.obligations.includes("art26_7.workers"));
});

test("public body deploying an Annex III system must do a FRIA and register the use", () => {
  const r = classify(
    { origin: "bought", use: "internal", areas: ["publicServices"], does: ["decides"] },
    { ...BOUGHT_AS_IS, "role.publicBody": true, "hr.annexIII": ["5a"], "hr.profiling": false, "hr.derogation": [], "p.scoring": false },
  );
  assert.ok(r.obligations.includes("art27.fria"));
  assert.ok(r.obligations.includes("art49_3.registration"));
});

test("a bought chatbot used as-is: limited risk, and Art. 50(1) is the provider's duty", () => {
  const r = classify(
    { origin: "bought", use: "internal", areas: ["business"], affected: ["customers"], does: ["chats"] },
    { ...BOUGHT_AS_IS, "role.publicBody": false, "p.scoring": false },
  );
  assert.deepEqual(r.missing, []);
  assert.equal(r.outputs.riskClass, "LIMITED");
  assert.deepEqual(r.obligations, ["art4.literacy"]);
});

test("Art. 6(3) derogation without profiling: not high-risk, provider must document and register", () => {
  const r = classify(
    { areas: ["employment"], does: ["scores"] },
    { "hr.annexIII": ["4a"], "hr.profiling": false, "hr.derogation": ["d"], "p.scoringUse": false },
  );
  assert.equal(r.outputs.highRisk, false);
  assert.equal(r.outputs.art6_3Exempt, true);
  assert.equal(r.outputs.riskClass, "MINIMAL");
  assert.ok(r.obligations.includes("art6_4.notHighRiskAssessment"));
  assert.ok(!r.obligations.includes("art9.riskManagement"));
});

test("derogation answers are ignored when the system profiles (question hidden)", () => {
  const r = classify({ areas: ["employment"], does: ["scores"] }, { "hr.annexIII": ["4a"], "hr.profiling": true, "hr.derogation": ["d"] });
  assert.equal(r.outputs.highRisk, true);
  assert.equal(r.outputs.art6_3Exempt, false);
});

test("emotion inference at work, not for medical or safety reasons, is flagged as a prohibited-practice risk", () => {
  const r = classify(
    { origin: "bought", use: "internal", areas: ["employment"], affected: ["employees"], does: ["emotions"] },
    { ...BOUGHT_AS_IS, "role.publicBody": false, "p.emotionsWhere": ["workplace"], "p.emotionsMedical": false },
  );
  assert.equal(r.outputs.riskClass, "PROHIBITED");
  assert.deepEqual(r.outputs.prohibitedPractices, ["Art. 5(1)(f)"]);
  assert.ok(r.obligations.includes("art5.cease"));
  assert.ok((r.outputs.attention as string[]).some((a) => a.includes("Art. 5(1)(f)")), "the reviewer is asked to assess it");
  assert.ok((r.outputs.transparency as string[]).includes("50(3)"), "emotion recognition also triggers Art. 50(3)");
});

test("emotion inference for safety reasons is not flagged", () => {
  const r = classify({ areas: ["employment"], does: ["emotions"] }, { "p.emotionsWhere": ["workplace"], "p.emotionsMedical": true });
  assert.equal(r.outputs.prohibited, false);
});

test("the prohibited-practice screen asks only where the record shows a pattern", () => {
  assert.deepEqual(classify({ areas: ["business"], does: ["generatesText"] }).asked.filter((id) => id.startsWith("p.")), []);
  const faces = classify({ areas: ["biometrics"], does: ["recognises"] }).asked;
  assert.ok(faces.includes("p.faces") && faces.includes("p.biocat"));
  assert.ok(!faces.includes("p.rbi"), "real-time identification is asked only for law enforcement");
});

test("an ed-tech assessment tool is not asked about law enforcement or product safety", () => {
  const r = classify({ areas: ["education"], affected: ["students"], does: ["scores"] }, { "hr.annexIII": ["3b", "6"], "hr.profiling": true, "p.scoringUse": false });
  for (const id of ["hr.annexI", "p.crime", "p.rbi", "p.faces", "p.biocat", "scope.exclusions"]) assert.ok(!r.asked.includes(id), `${id} should not be asked`);
  const annexIII = bundle.classification.sections.flatMap((s) => s.questions).find((q) => q.id === "hr.annexIII")!;
  assert.deepEqual(visibleOptions(annexIII, r.pruned).map((o) => o.id), ["3a", "3b", "3c", "3d"]);
  assert.deepEqual(r.pruned["hr.annexIII"], ["3b"], "an option that is not offered is dropped");
  assert.deepEqual(r.missing, []);
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
});

test("scope exclusions are asked only before production; research is out of scope", () => {
  assert.ok(!classify({}).asked.includes("scope.exclusions"));
  const r = classify({ stage: "pilot", areas: ["employment"], does: ["scores"] }, { "scope.exclusions": ["research"], "hr.annexIII": ["4a"] });
  assert.equal(r.outputs.riskClass, "OUT_OF_SCOPE");
  assert.deepEqual(r.obligations, []);
});

test("Annex I medical device with notified body: high-risk with the Annex I date", () => {
  const r = classify({ areas: ["health"], does: ["product"] }, { "hr.annexI": ["medical"], "hr.thirdPartyAssessment": true });
  assert.equal(r.outputs.riskClass, "HIGH_RISK");
  const art9 = applicableObligations(bundle, r.outputs).find((o) => o.def.key === "art9.riskManagement");
  assert.equal(art9?.appliesFrom, bundle.dates.highRiskAnnexI.date);
});

test("Digital Omnibus: machinery is Annex I Section B, high-risk but without separate AI Act high-risk obligations", () => {
  const r = classify({ areas: ["product"], does: ["product"] }, { "hr.annexI": ["machinery"], "hr.thirdPartyAssessment": true });
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
  const r = classify({ areas: ["business"], does: ["generatesMedia"] }, { "p.intimate": true });
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

test("the client's sector pre-fills a new system's area of use", () => {
  assert.deepEqual(suggestedAreas(bundle.applicability, { "co.sector": "education" }), ["education"]);
  assert.deepEqual(suggestedAreas(bundle.applicability, { "co.sector": "technology" }), []);
  assert.deepEqual(suggestedAreas(bundle.applicability, { "co.sector": "free text from an older version" }), []);
});

test("applicability: NIS2, DORA, CRA and Data Act are flagged as not covered, with SenecAI's services offered", () => {
  const r = evaluate(bundle.applicability, {
    "co.establishedInEU": true, "co.size": "medium", "co.sector": "finance",
    "ai.builds": false, "ai.uses": true, "ai.importsOrDistributes": false, "data.personal": true,
    "reg.nis2Sectors": ["banking"], "reg.financialEntity": true, "reg.digitalProducts": true, "reg.connectedData": true,
  });
  const findings = r.outputs.findings as { regulation: string; coveredInThisVersion: boolean; servicesAvailable?: boolean }[];
  assert.deepEqual(findings.map((f) => f.regulation), ["AI_ACT", "GDPR", "NIS2", "DORA", "CRA", "DATA_ACT"]);
  for (const f of findings.slice(2)) {
    assert.equal(f.coveredInThisVersion, false);
    assert.equal(f.servicesAvailable, true);
  }
  const small = evaluate(bundle.applicability, { "co.size": "small", "reg.nis2Sectors": ["food"] });
  assert.ok(!(small.outputs.findings as { regulation: string }[]).some((f) => f.regulation === "NIS2"), "NIS2 size threshold");
});

test("fraud detection (predicts or detects patterns) is asked about profiling and rights impact, not about biometrics", () => {
  const r = classify({ origin: "built", use: "internal", areas: ["finance"], affected: ["customers"], does: ["predicts"] }, { "role.publicBody": false, "p.scoring": false, "hr.rightsImpact": [] });
  assert.ok(r.asked.includes("p.scoring"));
  assert.ok(r.asked.includes("hr.rightsImpact"));
  assert.ok(!r.asked.includes("p.faces"));
  assert.deepEqual(r.missing, []);
  assert.equal(r.outputs.riskClass, "MINIMAL");
});

test("'something else' brings up the broad screening questions", () => {
  const r = classify({ areas: ["business"], does: ["other"] });
  for (const id of ["p.influence", "p.scoring", "hr.rightsImpact"]) assert.ok(r.asked.includes(id), id);
});
