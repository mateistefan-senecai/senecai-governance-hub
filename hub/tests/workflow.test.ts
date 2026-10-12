// Engine rules from the spec, exercised through the services against the
// database (needs `npx prisma db seed`). Each test runs in a transaction
// that is rolled back, so the demo data is left untouched.
//
// Run: npm test

import "dotenv/config";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { withTenant, withUser, type Tx } from "../src/lib/tenant";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { overrideClassification, submitClassification, ValidationError } from "../src/lib/services/classification";
import { updateSystem, type SystemInput } from "../src/lib/services/inventory";
import { assessObligation } from "../src/lib/services/assessment";
import type { Actor } from "../src/lib/services/audit";

const bundle = loadBundleFromDisk();
class Rollback extends Error {}

/** Runs `fn` as the SenecAI admin, then rolls everything back. */
async function scenario(fn: (tx: Tx, actor: Actor) => Promise<void>) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@senecai.dev" } });
  // Memberships are tenant-scoped: readable only once the user is known.
  const { organizationId: orgId } = await withUser(admin.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: admin.id } }));
  await assert.rejects(
    withTenant({ userId: admin.id, orgId }, async (tx) => {
      await fn(tx, { userId: admin.id, userName: admin.name, orgId });
      throw new Rollback();
    }),
    Rollback,
  );
}

const systemNamed = (tx: Tx, name: string) => tx.aiSystem.findFirstOrThrow({ where: { name } });
const input = (s: SystemInput & Record<string, unknown>): SystemInput => ({
  name: s.name, purpose: s.purpose, description: s.description, ownerName: s.ownerName, ownerRole: s.ownerRole,
  origin: s.origin, supplier: s.supplier, dataCategories: s.dataCategories, deploymentContext: s.deploymentContext,
  useType: s.useType, autonomy: s.autonomy, stage: s.stage, affectedPersons: s.affectedPersons,
});

after(() => prisma.$disconnect());

test("changing a system's purpose reopens its classification and flags assessed obligations", async () => {
  await scenario(async (tx, actor) => {
    const system = await systemNamed(tx, "Credit Scoring Engine");
    await updateSystem(tx, actor, system, { ...input(system), purpose: "Scores applicants for car leasing." });
    const after = await tx.aiSystem.findUniqueOrThrow({ where: { id: system.id } });
    assert.equal(after.classificationStale, true);
    const flagged = await tx.systemObligation.count({ where: { systemId: system.id, needsReassessment: true } });
    assert.ok(flagged > 0);
  });
});

test("editing the owner alone does not reopen the classification", async () => {
  await scenario(async (tx, actor) => {
    const system = await systemNamed(tx, "Credit Scoring Engine");
    await updateSystem(tx, actor, system, { ...input(system), ownerName: "Someone Else" });
    assert.equal((await tx.aiSystem.findUniqueOrThrow({ where: { id: system.id } })).classificationStale, false);
  });
});

test("an override needs a written reason and regenerates obligations", async () => {
  await scenario(async (tx, actor) => {
    const system = await systemNamed(tx, "Fraud Detection Alerts");
    const current = await tx.classification.findFirstOrThrow({ where: { systemId: system.id, isCurrent: true } });
    await assert.rejects(
      overrideClassification(tx, actor, system, current, { riskClass: "HIGH_RISK", roles: ["provider"], highRiskBasis: [], reason: "no" }, bundle),
      ValidationError,
    );
    await overrideClassification(
      tx, actor, system, current,
      { riskClass: "HIGH_RISK", roles: ["provider", "deployer"], highRiskBasis: ["annexIII"], reason: "Alerts block card payments automatically, which goes beyond pattern detection." },
      bundle,
    );
    const keys = (await tx.systemObligation.findMany({ where: { systemId: system.id, active: true } })).map((o) => o.obligationKey);
    assert.ok(keys.includes("art9.riskManagement"));
    const updated = await tx.classification.findUniqueOrThrow({ where: { id: current.id } });
    assert.equal(updated.status, "OVERRIDDEN");
  });
});

test("reclassifying keeps assessments of obligations that still apply and deactivates the rest", async () => {
  await scenario(async (tx, actor) => {
    const system = await systemNamed(tx, "Credit Scoring Engine");
    const current = await tx.classification.findFirstOrThrow({ where: { systemId: system.id, isCurrent: true } });
    // Same answers, but the company no longer uses the system itself: deployer duties fall away.
    await submitClassification(tx, actor, system, { ...(current.answers as object), "role.uses": false }, bundle);
    const logging = await tx.systemObligation.findFirstOrThrow({ where: { systemId: system.id, obligationKey: "art12.recordKeeping" } });
    assert.equal(logging.status, "COMPLIANT");
    assert.equal(logging.active, true);
    const fria = await tx.systemObligation.findFirstOrThrow({ where: { systemId: system.id, obligationKey: "art27.fria" } });
    assert.equal(fria.active, false);
  });
});

test("compliant needs a rationale; gap creates exactly one action; compliant closes it", async () => {
  await scenario(async (tx, actor) => {
    const system = await systemNamed(tx, "Credit Scoring Engine");
    const so = await tx.systemObligation.findFirstOrThrow({
      where: { systemId: system.id, obligationKey: "art47.declaration" },
      include: { system: { select: { clientId: true } } },
    });
    await assert.rejects(assessObligation(tx, actor, so, "COMPLIANT", "", bundle), ValidationError);
    await assessObligation(tx, actor, so, "GAP", "No declaration drawn up.", bundle);
    await assessObligation(tx, actor, so, "PARTIAL", "Draft exists.", bundle);
    assert.equal(await tx.action.count({ where: { systemObligationId: so.id } }), 1);
    await tx.action.updateMany({ where: { systemObligationId: so.id }, data: { status: "IN_PROGRESS" } });
    await assessObligation(tx, actor, so, "COMPLIANT", "Signed declaration reviewed in the client meeting.", bundle);
    const action = await tx.action.findFirstOrThrow({ where: { systemObligationId: so.id } });
    assert.equal(action.status, "DONE");
  });
});
