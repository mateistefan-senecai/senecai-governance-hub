// PDF deliverables and their state machine (spec §3–4, §6; concept note
// §6–7), exercised through the services against the seeded database. Each
// test runs in a transaction that is rolled back.
//
// Run: npm test

import "dotenv/config";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { withTenant, withUser, type Tx } from "../src/lib/tenant";
import { ForbiddenError } from "../src/lib/authz";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { ValidationError } from "../src/lib/services/classification";
import { updateSystem, type SystemInput } from "../src/lib/services/inventory";
import { assessObligation } from "../src/lib/services/assessment";
import { refreshDocuments } from "../src/lib/documents/freshness";
import { documentStore } from "../src/lib/documents/store";
import {
  generateDocument,
  listDocuments,
  readDocumentPdf,
  transitionDocument,
  type DocActor,
} from "../src/lib/services/documents";

const bundle = loadBundleFromDisk();
class Rollback extends Error {}

type Actors = { admin: DocActor; reviewer: DocActor; companyUser: DocActor; clientId: string };

/** Runs `fn` inside SenecAI with its three kinds of user, then rolls everything back. */
async function scenario(fn: (tx: Tx, a: Actors) => Promise<void>) {
  const users = await prisma.user.findMany({ where: { email: { in: ["admin@senecai.dev", "consultant@senecai.dev", "client@novabank.dev"] } } });
  const by = (email: string) => users.find((u) => u.email === email)!;
  const admin = by("admin@senecai.dev");
  const { organizationId: orgId } = await withUser(admin.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: admin.id } }));
  const as = (email: string, role: DocActor["role"]): DocActor => ({ userId: by(email).id, userName: by(email).name, orgId, role });
  await assert.rejects(
    withTenant({ userId: admin.id, orgId }, async (tx) => {
      const client = await tx.client.findFirstOrThrow({ where: { name: "NovaBank Retail SRL" } });
      await fn(tx, {
        admin: as("admin@senecai.dev", "ORG_ADMIN"),
        reviewer: as("consultant@senecai.dev", "REVIEWER"),
        companyUser: as("client@novabank.dev", "COMPANY_USER"),
        clientId: client.id,
      });
      throw new Rollback();
    }),
    Rollback,
  );
}

const input = (s: SystemInput & Record<string, unknown>): SystemInput => ({
  name: s.name, purpose: s.purpose, description: s.description, ownerName: s.ownerName, ownerRole: s.ownerRole,
  origin: s.origin, supplier: s.supplier, dataCategories: s.dataCategories, deploymentContext: s.deploymentContext,
  useType: s.useType, autonomy: s.autonomy, stage: s.stage, affectedPersons: s.affectedPersons,
});

/** The seeded, released inventory PDF is current; edit a system so a new version can be generated. */
async function freshInventory(tx: Tx, a: Actors) {
  const system = await tx.aiSystem.findFirstOrThrow({ where: { name: "Fraud Detection Alerts" } });
  await updateSystem(tx, a.admin, system, { ...input(system), ownerName: "Ana Pop" });
  return generateDocument(tx, a.reviewer, a.clientId, "INVENTORY");
}

after(() => prisma.$disconnect());

test("a company user can neither generate, approve nor release, and sees released documents only", async () => {
  await scenario(async (tx, a) => {
    await assert.rejects(generateDocument(tx, a.companyUser, a.clientId, "ROADMAP"), ForbiddenError);
    const doc = await freshInventory(tx, a);
    for (const step of ["submit", "approve", "release"] as const) {
      await assert.rejects(transitionDocument(tx, a.companyUser, a.clientId, doc.id, step), ForbiddenError);
    }

    const forClient = (await listDocuments(tx, "COMPANY_USER", a.clientId)).flatMap((g) => g.versions);
    assert.ok(forClient.length > 0);
    assert.ok(forClient.every((d) => d.state === "RELEASED"));
    assert.equal(await readDocumentPdf(tx, "COMPANY_USER", a.clientId, doc.id), null, "a draft is not downloadable by the client");
    const draftClassification = await tx.document.findFirstOrThrow({ where: { clientId: a.clientId, kind: "CLASSIFICATION" } });
    assert.equal(await readDocumentPdf(tx, "COMPANY_USER", a.clientId, draftClassification.id), null);
    assert.ok(await readDocumentPdf(tx, "REVIEWER", a.clientId, doc.id));
  });
});

test("draft → in review → approved → released, signed by the named reviewer, one immutable PDF per state, all audited", async () => {
  await scenario(async (tx, a) => {
    const doc = await freshInventory(tx, a);
    assert.equal(doc.version, 2);
    assert.equal(doc.state, "DRAFT");
    await assert.rejects(transitionDocument(tx, a.reviewer, a.clientId, doc.id, "approve"), ValidationError, "must be in review first");
    await assert.rejects(transitionDocument(tx, a.reviewer, a.clientId, doc.id, "release"), ValidationError);

    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "submit");
    await assert.rejects(transitionDocument(tx, a.reviewer, a.clientId, doc.id, "sendBack", { comment: "no" }), ValidationError);
    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "sendBack", { comment: "Add the supplier contact for the chatbot." });
    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "submit");
    const approved = await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "approve");
    assert.equal(approved.reviewerName, "Elena Marin");
    assert.equal(approved.reviewerId, a.reviewer.userId);
    assert.ok(approved.approvedAt);
    const released = await transitionDocument(tx, a.admin, a.clientId, doc.id, "release");
    assert.equal(released.state, "RELEASED");
    assert.equal(released.reviewerName, "Elena Marin", "releasing does not change who approved");

    const files = await tx.documentFile.findMany({ where: { documentId: doc.id } });
    assert.deepEqual(files.map((f) => f.state).sort(), ["APPROVED", "DRAFT", "IN_REVIEW", "RELEASED"]);
    for (const f of files) assert.equal(Buffer.from(f.data).subarray(0, 5).toString(), "%PDF-");
    const pdf = await documentStore.get(tx, doc.id, "RELEASED");
    assert.ok(pdf && pdf.byteSize > 1000);

    const actions = (await tx.auditEvent.findMany({ where: { entityId: doc.id }, orderBy: { at: "asc" } })).map((e) => e.action);
    assert.deepEqual(actions, [
      "document.generated",
      "document.submitted",
      "document.sentBack",
      "document.submitted",
      "document.approved",
      "document.released",
    ]);
  });
});

test("the database refuses an approval without a named reviewer and any illegal transition", async () => {
  await scenario(async (tx, a) => {
    const doc = await freshInventory(tx, a);
    const sp = async (fn: () => Promise<unknown>, pattern: RegExp) => {
      // A failed statement aborts the transaction: isolate each attempt in a savepoint.
      await tx.$executeRawUnsafe("SAVEPOINT attempt");
      await assert.rejects(fn(), pattern);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT attempt");
    };
    await sp(() => tx.document.update({ where: { id: doc.id }, data: { state: "APPROVED", reviewerId: a.reviewer.userId, reviewerName: "X", approvedAt: new Date() } }), /Illegal document transition/);
    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "submit");
    await sp(() => tx.document.update({ where: { id: doc.id }, data: { state: "APPROVED" } }), /Document_approved_needs_reviewer/);
    await sp(() => tx.document.update({ where: { id: doc.id }, data: { state: "APPROVED", reviewerId: a.reviewer.userId, reviewerName: "  ", approvedAt: new Date() } }), /Document_approved_needs_reviewer/);
    await sp(() => tx.document.update({ where: { id: doc.id }, data: { snapshot: { tampered: true } } }), /immutable/);
    await sp(() => tx.document.delete({ where: { id: doc.id } }), /cannot be deleted/);
    await sp(() => tx.documentFile.updateMany({ where: { documentId: doc.id }, data: { byteSize: 1 } }), /immutable/);
    await sp(() => tx.documentFile.deleteMany({ where: { documentId: doc.id } }), /immutable/);
  });
});

test("open points block approval: a classification report cannot be approved while classifications are unreviewed", async () => {
  await scenario(async (tx, a) => {
    const doc = await tx.document.findFirstOrThrow({ where: { clientId: a.clientId, kind: "CLASSIFICATION" } });
    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "submit");
    await assert.rejects(transitionDocument(tx, a.reviewer, a.clientId, doc.id, "approve"), /not been reviewed|not classified/);
  });
});

test("a record change marks the affected documents outdated, not the others; regenerating keeps the old version", async () => {
  await scenario(async (tx, a) => {
    const released = await tx.document.findFirstOrThrow({ where: { clientId: a.clientId, kind: "INVENTORY" } });
    const obligationsDoc = await generateDocument(tx, a.reviewer, a.clientId, "OBLIGATIONS");
    const gapDoc = await generateDocument(tx, a.reviewer, a.clientId, "GAP_ASSESSMENT");
    await transitionDocument(tx, a.reviewer, a.clientId, obligationsDoc.id, "submit");
    await assert.rejects(generateDocument(tx, a.reviewer, a.clientId, "GAP_ASSESSMENT"), /Nothing has changed/);

    // An assessment changes the gap assessment only.
    const so = await tx.systemObligation.findFirstOrThrow({
      where: { system: { name: "Credit Scoring Engine" }, obligationKey: "art47.declaration" },
      include: { system: { select: { clientId: true } } },
    });
    await assessObligation(tx, a.reviewer, so, "GAP", "No declaration drawn up yet.", bundle);
    const state = async (id: string) => tx.document.findUniqueOrThrow({ where: { id } });
    assert.equal((await state(gapDoc.id)).outdated, true);
    assert.equal((await state(obligationsDoc.id)).outdated, false);
    assert.equal((await state(released.id)).outdated, false);

    // Editing a system (the living register) outdates the inventory, including a released one.
    const system = await tx.aiSystem.findFirstOrThrow({ where: { name: "Customer Support Chatbot" } });
    await updateSystem(tx, a.admin, system, { ...input(system), deploymentContext: "Website, app and call centre" });
    const outdated = await state(released.id);
    assert.equal(outdated.outdated, true);
    assert.equal(outdated.state, "RELEASED", "the client keeps the released version, flagged outdated");
    assert.ok(await tx.auditEvent.findFirst({ where: { entityId: released.id, action: "document.outdated" } }));

    // An outdated document can no longer move forward…
    await transitionDocument(tx, a.reviewer, a.clientId, gapDoc.id, "submit").then(
      () => assert.fail("an outdated draft was submitted"),
      (e) => assert.match(String(e), /outdated/),
    );
    // …and a new version starts as a draft, the old one kept with its PDF.
    const v2 = await generateDocument(tx, a.reviewer, a.clientId, "INVENTORY");
    assert.equal(v2.version, released.version + 1);
    assert.equal(v2.state, "DRAFT");
    const kept = await state(released.id);
    assert.equal(kept.state, "RELEASED");
    assert.deepEqual(kept.snapshot, released.snapshot);
    assert.ok(await documentStore.get(tx, released.id, "RELEASED"));
    // The edit reopened the classification, so the obligation mapping is outdated too.
    assert.equal((await state(obligationsDoc.id)).outdated, true);
    await generateDocument(tx, a.reviewer, a.clientId, "OBLIGATIONS");
    // Only the latest version can move.
    await assert.rejects(
      transitionDocument(tx, a.reviewer, a.clientId, obligationsDoc.id, "sendBack", { comment: "Reconsider the deployer duties." }),
      /newer version/,
    );
  });
});

test("a new legal content version outdates documents built on the previous one", async () => {
  await scenario(async (tx, a) => {
    const doc = await tx.document.findFirstOrThrow({ where: { clientId: a.clientId, kind: "INVENTORY" } });
    await tx.contentVersion.create({
      data: { version: "9999.test", status: "PUBLISHED", publishedAt: new Date(), bundle: { ...bundle, version: "9999.test", status: "PUBLISHED" } as object },
    });
    const marked = await refreshDocuments(tx, a.reviewer, a.clientId, "page viewed");
    assert.ok(marked.some((d) => d.id === doc.id));
    const event = await tx.auditEvent.findFirstOrThrow({ where: { entityId: doc.id, action: "document.outdated" } });
    assert.equal((event.after as { reason: string }).reason, "legal content version changed");
    const v2 = await generateDocument(tx, a.reviewer, a.clientId, "INVENTORY");
    assert.equal(v2.contentVersion, "9999.test");
  });
});

test("approving checks the inputs again, even if nothing flagged the document", async () => {
  await scenario(async (tx, a) => {
    const doc = await freshInventory(tx, a);
    await transitionDocument(tx, a.reviewer, a.clientId, doc.id, "submit");
    // A change that bypasses the services (and so the outdated hook).
    await tx.aiSystem.updateMany({ where: { name: "Marketing Copy Generator" }, data: { purpose: "Drafts all customer letters." } });
    await assert.rejects(transitionDocument(tx, a.reviewer, a.clientId, doc.id, "approve"), /changed after it was generated/);
  });
});
