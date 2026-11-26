// User invitations and firm workspaces (migration invitations_pilot).
// Who may invite whom; the link works once, only before it expires; an
// anonymous visitor sees an invitation only with its token; another firm
// never sees it; SenecAI opens a firm but cannot get back in once the firm
// has joined. Runs against the seeded database.

import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { withPublic, withTenant, withUser } from "../src/lib/tenant";
import { ForbiddenError } from "../src/lib/authz";
import { ValidationError } from "../src/lib/services/classification";
import {
  acceptInvitation,
  createInvitation,
  hashToken,
  renewInvitation,
  revokeInvitation,
  viewInvitation,
  type Inviter,
} from "../src/lib/services/invitations";
import { createFirm, listFirms, renewFirmInvitation } from "../src/lib/services/firms";

const stamp = Date.now();
const email = (tag: string) => `test-inv-${tag}-${stamp}@example.com`;
const PASSWORD = "a-long-test-password";

let admin: Inviter;
let consultant: Inviter;
let companyUser: Inviter;
let lawyer: Inviter;
let novabank: string;
let otherClient: string;
const firmIds: string[] = [];

async function inviter(address: string, role?: string): Promise<Inviter> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: address } });
  const m = await withUser(user.id, (tx) =>
    tx.membership.findFirstOrThrow({ where: { userId: user.id, ...(role ? { role: role as never } : {}) }, orderBy: { createdAt: "asc" } }),
  );
  return { userId: user.id, userName: user.name, orgId: m.organizationId, role: m.role, membershipId: m.id, clientId: m.clientId };
}

before(async () => {
  admin = await inviter("admin@senecai.dev");
  consultant = await inviter("consultant@senecai.dev");
  companyUser = await inviter("client@novabank.dev");
  lawyer = await inviter("lawyer@ionescu.law", "ORG_ADMIN");
  novabank = companyUser.clientId!;
  const c = await withTenant(admin, (tx) => tx.client.create({ data: { organizationId: admin.orgId, name: `Test inv client ${stamp}` } }));
  otherClient = c.id;
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "test-inv-" } }, select: { id: true } });
  for (const org of [admin.orgId, lawyer.orgId, ...firmIds]) {
    await withTenant({ userId: admin.userId, orgId: org }, async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.allow_purge', 'on', true)`;
      await tx.membership.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
      await tx.invitation.deleteMany({ where: { email: { startsWith: "test-inv-" } } });
      if (firmIds.includes(org)) await tx.organization.delete({ where: { id: org } });
    });
  }
  await withTenant(admin, async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.allow_purge', 'on', true)`;
    await tx.auditEvent.deleteMany({ where: { action: "firm.created", entityId: { in: firmIds } } });
    await tx.client.delete({ where: { id: otherClient } });
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: "test-inv-" } } });
  await prisma.$disconnect();
});

test("an admin can invite every role; the invitee accepts and gets exactly that access", async () => {
  const { token } = await withTenant(admin, (tx) =>
    createInvitation(tx, admin, { name: "New Reviewer", email: email("rev"), role: "REVIEWER", clientId: novabank }),
  );
  const view = await viewInvitation(token);
  assert.equal(view?.role, "REVIEWER");
  assert.match(view?.clientName ?? "", /^NovaBank/);
  assert.equal(view?.hasAccount, false);
  assert.equal(view?.problem, null);

  await acceptInvitation(token, { password: PASSWORD, confirm: PASSWORD });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: email("rev") } });
  const m = await withTenant({ userId: user.id, orgId: admin.orgId }, (tx) =>
    tx.membership.findFirstOrThrow({ where: { userId: user.id }, include: { assignments: true } }),
  );
  assert.equal(m.role, "REVIEWER");
  assert.equal(m.organizationId, admin.orgId);
  assert.deepEqual(m.assignments.map((a) => a.clientId), [novabank]);
});

test("a link works once", async () => {
  const { token } = await withTenant(admin, (tx) => createInvitation(tx, admin, { name: "Once", email: email("once"), role: "ORG_ADMIN" }));
  await acceptInvitation(token, { password: PASSWORD });
  assert.equal((await viewInvitation(token))?.problem, "used");
  await assert.rejects(acceptInvitation(token, { password: PASSWORD }), ValidationError);
});

test("an expired, revoked or renewed link no longer works", async () => {
  const { invitation, token } = await withTenant(admin, (tx) =>
    createInvitation(tx, admin, { name: "Late", email: email("late"), role: "COMPANY_USER", clientId: novabank }, new Date(Date.now() - 15 * 86_400_000)),
  );
  assert.equal((await viewInvitation(token))?.problem, "expired");
  await assert.rejects(acceptInvitation(token, { password: PASSWORD }), /expired/);

  const renewed = await withTenant(admin, (tx) => renewInvitation(tx, admin, invitation.id));
  assert.equal(await viewInvitation(token), null, "the old link matches nothing");
  assert.equal((await viewInvitation(renewed.token))?.problem, null);

  await withTenant(admin, (tx) => revokeInvitation(tx, admin, invitation.id));
  await assert.rejects(acceptInvitation(renewed.token, { password: PASSWORD }), /no longer valid/);
});

test("a new account needs a long enough password", async () => {
  const { token } = await withTenant(admin, (tx) => createInvitation(tx, admin, { name: "Short", email: email("short"), role: "ORG_ADMIN" }));
  await assert.rejects(acceptInvitation(token, { password: "short" }), /at least/);
  await assert.rejects(acceptInvitation(token, { password: PASSWORD, confirm: "different-password" }), /do not match/);
});

test("an existing account joins with its own password", async () => {
  // The lawyer already has an account (Ionescu); SenecAI invites them as a reviewer.
  const { token } = await withTenant(admin, (tx) =>
    createInvitation(tx, admin, { name: "Lawyer", email: email("existing"), role: "ORG_ADMIN" }),
  );
  await acceptInvitation(token, { password: PASSWORD });
  const second = await withTenant(lawyer, (tx) => createInvitation(tx, lawyer, { name: "Same person", email: email("existing"), role: "REVIEWER" }));
  assert.equal((await viewInvitation(second.token))?.hasAccount, true);
  await assert.rejects(acceptInvitation(second.token, { password: "wrong-password-here" }), /not the password/);
  await acceptInvitation(second.token, { password: PASSWORD });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: email("existing") } });
  assert.equal(await withUser(user.id, (tx) => tx.membership.count({ where: { userId: user.id } })), 2);
});

test("a reviewer invites company users only for their assigned clients", async () => {
  await withTenant(consultant, (tx) =>
    createInvitation(tx, consultant, { name: "Colleague", email: email("r1"), role: "COMPANY_USER", clientId: novabank }),
  );
  await assert.rejects(
    withTenant(consultant, (tx) => createInvitation(tx, consultant, { name: "X", email: email("r2"), role: "COMPANY_USER", clientId: otherClient })),
    ForbiddenError,
  );
  await assert.rejects(
    withTenant(consultant, (tx) => createInvitation(tx, consultant, { name: "X", email: email("r3"), role: "REVIEWER", clientId: novabank })),
    ForbiddenError,
  );
});

test("a company user invites colleagues for their own company only", async () => {
  await withTenant(companyUser, (tx) =>
    createInvitation(tx, companyUser, { name: "Colleague", email: email("c1"), role: "COMPANY_USER", clientId: novabank }),
  );
  await assert.rejects(
    withTenant(companyUser, (tx) => createInvitation(tx, companyUser, { name: "X", email: email("c2"), role: "COMPANY_USER", clientId: otherClient })),
    ForbiddenError,
  );
  await assert.rejects(
    withTenant(companyUser, (tx) => createInvitation(tx, companyUser, { name: "X", email: email("c3"), role: "ORG_ADMIN" })),
    ForbiddenError,
  );
});

test("someone who already has access is not invited again", async () => {
  await assert.rejects(
    withTenant(admin, (tx) => createInvitation(tx, admin, { name: "Radu", email: "client@novabank.dev", role: "COMPANY_USER", clientId: novabank })),
    /already has access/,
  );
});

test("invitations are invisible to another firm and to a visitor without the token", async () => {
  await withTenant(admin, (tx) => createInvitation(tx, admin, { name: "Hidden", email: email("hidden"), role: "ORG_ADMIN" }));
  await withTenant(lawyer, async (tx) => {
    assert.equal(await tx.invitation.count({ where: { email: email("hidden") } }), 0);
    assert.equal((await tx.invitation.updateMany({ where: { email: email("hidden") }, data: { revokedAt: new Date() } })).count, 0);
  });
  await withPublic(async (tx) => assert.equal(await tx.invitation.count(), 0));
  // A wrong token shows nothing either.
  assert.equal(await viewInvitation("not-a-real-token"), null);
  assert.notEqual(hashToken("a"), hashToken("b"));
});

test("SenecAI opens a firm workspace, then loses the right to re-invite once the firm joined", async () => {
  const { firmId, token } = await createFirm(admin, { name: `Test Firm ${stamp}`, adminName: "Firm Admin", adminEmail: email("firm"), pilot: true });
  firmIds.push(firmId);
  const firm = (await listFirms(admin)).find((f) => f.id === firmId);
  assert.equal(firm?.joined, false);
  assert.equal(firm?.pilot, true);

  const again = await renewFirmInvitation(admin, firmId);
  assert.equal((await viewInvitation(token))?.problem, "revoked", "the first link was replaced");
  await acceptInvitation(again.token, { password: PASSWORD });

  assert.equal((await listFirms(admin)).find((f) => f.id === firmId)?.joined, true);
  await assert.rejects(renewFirmInvitation(admin, firmId), ForbiddenError);
  // SenecAI still sees nothing of the firm in its own organisation.
  await withTenant(admin, async (tx) => assert.equal(await tx.organization.count({ where: { id: firmId } }), 0));

  const user = await prisma.user.findUniqueOrThrow({ where: { email: email("firm") } });
  const m = await withUser(user.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: user.id }, include: { organization: true } }));
  assert.equal(m.role, "ORG_ADMIN");
  assert.equal(m.organization.type, "LAW_FIRM");
  assert.equal(m.organization.pilot, true);
});

test("only SenecAI's admins can open a firm workspace", async () => {
  await assert.rejects(createFirm(lawyer, { name: "X", adminName: "X", adminEmail: email("x"), pilot: false }), ForbiddenError);
  await assert.rejects(createFirm(consultant, { name: "X", adminName: "X", adminEmail: email("y"), pilot: false }), ForbiddenError);
});
