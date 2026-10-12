// Tries to cross tenants at the database level (concept note §11). These run
// against the database in DATABASE_URL after `npx prisma db seed`, through
// the same withTenant/withUser transactions the app uses (which switch to
// the hub_app role), so row-level security applies exactly as in the app. The queries here deliberately have
// no organisation filter: the database alone must keep tenants apart.
//
// Run: npm test

import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { withTenant, withUser } from "../src/lib/tenant";

let senecai: { orgId: string; userId: string };
let ionescu: { orgId: string; userId: string };
let ionescuClientId: string;
let ionescuSystemId: string;

before(async () => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@senecai.dev" } });
  const lawyer = await prisma.user.findUniqueOrThrow({ where: { email: "lawyer@ionescu.law" } });
  const adminOrgs = await withUser(admin.id, (tx) => tx.membership.findMany({ where: { userId: admin.id } }));
  const lawyerOrgs = await withUser(lawyer.id, (tx) =>
    tx.membership.findMany({ where: { userId: lawyer.id, role: "ORG_ADMIN" } }),
  );
  senecai = { orgId: adminOrgs[0].organizationId, userId: admin.id };
  ionescu = { orgId: lawyerOrgs[0].organizationId, userId: lawyer.id };
  const client = await withTenant(ionescu, (tx) => tx.client.findFirstOrThrow());
  const system = await withTenant(ionescu, (tx) => tx.aiSystem.findFirstOrThrow());
  ionescuClientId = client.id;
  ionescuSystemId = system.id;
});

after(() => prisma.$disconnect());

test("without an organisation chosen, no tenant rows are visible", async () => {
  await withUser("someone-with-no-memberships", async (tx) => {
    assert.equal(await tx.client.count(), 0);
    assert.equal(await tx.aiSystem.count(), 0);
    assert.equal(await tx.organization.count(), 0);
  });
});

test("one tenant cannot read another tenant's clients, systems or audit log", async () => {
  await withTenant(senecai, async (tx) => {
    assert.equal(await tx.client.findUnique({ where: { id: ionescuClientId } }), null);
    assert.equal(await tx.aiSystem.findUnique({ where: { id: ionescuSystemId } }), null);
    const orgIds = new Set((await tx.client.findMany()).map((c) => c.organizationId));
    assert.deepEqual([...orgIds], [senecai.orgId]);
    const auditOrgs = new Set((await tx.auditEvent.findMany()).map((e) => e.organizationId));
    assert.deepEqual([...auditOrgs], [senecai.orgId]);
  });
});

test("one tenant cannot update or delete another tenant's rows", async () => {
  await withTenant(senecai, async (tx) => {
    const updated = await tx.aiSystem.updateMany({ where: { id: ionescuSystemId }, data: { name: "hijacked" } });
    assert.equal(updated.count, 0);
    const deleted = await tx.client.deleteMany({ where: { id: ionescuClientId } });
    assert.equal(deleted.count, 0);
  });
  const name = await withTenant(ionescu, (tx) => tx.aiSystem.findUniqueOrThrow({ where: { id: ionescuSystemId } }));
  assert.notEqual(name.name, "hijacked");
});

test("one tenant cannot insert rows into another tenant", async () => {
  await assert.rejects(
    withTenant(senecai, (tx) => tx.client.create({ data: { organizationId: ionescu.orgId, name: "Planted client" } })),
    /row-level security/,
  );
});

test("a user sees only their own memberships across organisations", async () => {
  const visible = await withUser(ionescu.userId, (tx) => tx.membership.findMany());
  assert.ok(visible.length >= 2, "the lawyer belongs to their firm and to Vitalis");
  assert.ok(visible.every((m) => m.userId === ionescu.userId));
  const orgs = await withUser(ionescu.userId, (tx) => tx.organization.findMany());
  assert.ok(!orgs.some((o) => o.id === senecai.orgId));
});

test("the audit log is append-only", async () => {
  await assert.rejects(
    withTenant(senecai, (tx) => tx.auditEvent.updateMany({ data: { action: "tampered" } })),
    /append-only/,
  );
  await assert.rejects(withTenant(senecai, (tx) => tx.auditEvent.deleteMany()), /append-only/);
});

test("tenant transactions run as hub_app, which cannot bypass row-level security", async () => {
  const [role] = await withTenant(senecai, (tx) =>
    tx.$queryRaw<{ name: string; bypass: boolean; superuser: boolean }[]>`
      SELECT current_user AS name, rolbypassrls AS bypass, rolsuper AS superuser FROM pg_roles WHERE rolname = current_user`,
  );
  assert.deepEqual(role, { name: "hub_app", bypass: false, superuser: false });
});
