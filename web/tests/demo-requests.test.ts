// Demo requests from the public landing page (migration demo_requests).
// Anyone may insert a new request; only the organisation that receives them
// (SenecAI) may read, update or delete one. Runs against the seeded database.

import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { withPublic, withTenant, withUser } from "../src/lib/tenant";
import { createDemoRequest } from "../src/lib/services/demo-requests";
import { ValidationError } from "../src/lib/services/classification";

let senecai: { orgId: string; userId: string };
let ionescu: { orgId: string; userId: string };
const marker = `test-${Date.now()}@example.com`;

const valid = {
  name: "Test Person",
  email: marker,
  organization: "Test Firm",
  requesterType: "LAW_FIRM" as const,
  consent: "on" as const,
};

before(async () => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@senecai.dev" } });
  const lawyer = await prisma.user.findUniqueOrThrow({ where: { email: "lawyer@ionescu.law" } });
  const a = await withUser(admin.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: admin.id } }));
  const l = await withUser(lawyer.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: lawyer.id, role: "ORG_ADMIN" } }));
  senecai = { orgId: a.organizationId, userId: admin.id };
  ionescu = { orgId: l.organizationId, userId: lawyer.id };
});

after(async () => {
  await withTenant(senecai, (tx) => tx.demoRequest.deleteMany({ where: { email: { startsWith: "test-" } } }));
  await prisma.$disconnect();
});

test("an anonymous visitor can send a request but not read any", async () => {
  await withPublic((tx) => createDemoRequest(tx, valid));
  await withPublic(async (tx) => assert.equal(await tx.demoRequest.count(), 0));
  const stored = await withTenant(senecai, (tx) => tx.demoRequest.findMany({ where: { email: marker } }));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].status, "NEW");
  assert.ok(stored[0].consentAt);
});

test("a request needs consent, a valid email and a requester type", async () => {
  await assert.rejects(withPublic((tx) => createDemoRequest(tx, { ...valid, consent: undefined as never })), ValidationError);
  await assert.rejects(withPublic((tx) => createDemoRequest(tx, { ...valid, email: "not-an-email" })), ValidationError);
  await assert.rejects(withPublic((tx) => createDemoRequest(tx, { ...valid, requesterType: "X" as never })), ValidationError);
});

test("an anonymous visitor cannot insert a request already marked handled", async () => {
  await assert.rejects(
    withPublic((tx) =>
      tx.demoRequest.createMany({
        data: [{ ...valid, email: `test-h-${marker}`, consent: undefined, consentAt: new Date(), status: "CLOSED" } as never],
      }),
    ),
  );
});

test("another firm cannot read, update or delete demo requests", async () => {
  await withTenant(ionescu, async (tx) => {
    assert.equal(await tx.demoRequest.count(), 0);
    const { count } = await tx.demoRequest.updateMany({ data: { status: "CLOSED" } });
    assert.equal(count, 0);
    assert.equal((await tx.demoRequest.deleteMany({})).count, 0);
  });
  const stored = await withTenant(senecai, (tx) => tx.demoRequest.findFirstOrThrow({ where: { email: marker } }));
  assert.equal(stored.status, "NEW");
});

test("the app cannot make another organisation a receiver of demo requests", async () => {
  await assert.rejects(
    withTenant(ionescu, (tx) => tx.organization.update({ where: { id: ionescu.orgId }, data: { receivesDemoRequests: true } })),
    /receivesDemoRequests can only be set by a migration/,
  );
});
