// SenecAI, as the Hub's vendor, opens a workspace for a law firm and invites
// its first admin. After that the firm is a tenant like any other: SenecAI
// sees none of its data (spec §2). The only things SenecAI keeps are the
// record that it created the firm (in SenecAI's own audit log) and, while
// nobody has joined yet, the right to send the first admin a new link.

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Tx } from "@/lib/tenant";
import { withTenant } from "@/lib/tenant";
import { ForbiddenError } from "@/lib/authz";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";
import { createInvitation, emailInvitation, type Inviter } from "./invitations";
import { receivesDemoRequests } from "./demo-requests";

const schema = z.object({
  name: z.string().trim().min(1, "Enter the firm's name.").max(200),
  adminName: z.string().trim().min(1, "Enter the name of the firm's admin.").max(120),
  adminEmail: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address for the admin.")),
  pilot: z.boolean(),
});
export type FirmInput = z.input<typeof schema>;

export type FirmRecord = { id: string; name: string; adminName: string; adminEmail: string; pilot: boolean; createdAt: Date; joined: boolean };

type VendorAdmin = Actor & { role: string };

async function assertVendorAdmin(vendor: VendorAdmin) {
  if (vendor.role !== "ORG_ADMIN") throw new ForbiddenError("Only an admin of SenecAI can open a firm workspace.");
  const ok = await withTenant(vendor, (tx) => receivesDemoRequests(tx, vendor.orgId));
  if (!ok) throw new ForbiddenError("Only SenecAI can open a firm workspace.");
}

/** The invitation is issued in the firm's name by the SenecAI admin, as an admin of nothing else there. */
const inviterIn = (vendor: VendorAdmin, firmId: string): Inviter => ({
  userId: vendor.userId,
  userName: vendor.userName,
  orgId: firmId,
  role: "ORG_ADMIN",
  membershipId: "senecai-vendor",
  clientId: null,
});

/** Opens a law firm workspace and invites its first admin. Returns the one-time link token. */
export async function createFirm(vendor: VendorAdmin, input: FirmInput) {
  await assertVendorAdmin(vendor);
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  const { name, adminName, adminEmail, pilot } = parsed.data;
  const firmId = `org_${randomUUID().replace(/-/g, "")}`;

  return withTenant({ userId: vendor.userId, orgId: firmId }, async (tx) => {
    await tx.organization.create({ data: { id: firmId, name, brandName: name, type: "LAW_FIRM", pilot } });
    const { invitation, token } = await createInvitation(tx, inviterIn(vendor, firmId), { name: adminName, email: adminEmail, role: "ORG_ADMIN" });
    await audit(tx, inviterIn(vendor, firmId), { entityType: "Organization", entityId: firmId, action: "organization.created", after: { name, pilot, by: "SenecAI" } });
    const email = await emailInvitation(tx, invitation, token, { organizationName: name });
    // Back in SenecAI's own organisation: the record of what it opened.
    await tx.$executeRaw`SELECT set_config('app.org_id', ${vendor.orgId}, true)`;
    await audit(tx, vendor, { entityType: "Organization", entityId: firmId, action: "firm.created", after: { name, adminName, adminEmail, pilot } });
    return { firmId, token, email };
  });
}

/** The firms SenecAI opened, from its own audit log, and whether anyone has joined each. */
export async function listFirms(vendor: VendorAdmin): Promise<FirmRecord[]> {
  await assertVendorAdmin(vendor);
  const events = await withTenant(vendor, (tx) =>
    tx.auditEvent.findMany({ where: { action: "firm.created" }, orderBy: { at: "desc" } }),
  );
  const firms: FirmRecord[] = [];
  for (const e of events) {
    const after = e.after as { name: string; adminName: string; adminEmail: string; pilot: boolean };
    // Only a count: whether the firm's admin has joined, nothing else of the firm.
    const joined = await withTenant({ userId: vendor.userId, orgId: e.entityId }, (tx) => tx.membership.count({ where: { organizationId: e.entityId } }));
    firms.push({ id: e.entityId, ...after, createdAt: e.at, joined: joined > 0 });
  }
  return firms;
}

/** A new link for the firm's first admin, allowed only while nobody has joined the firm. */
export async function renewFirmInvitation(vendor: VendorAdmin, firmId: string) {
  await assertVendorAdmin(vendor);
  const created = await withTenant(vendor, (tx) => tx.auditEvent.findFirst({ where: { action: "firm.created", entityId: firmId } }));
  if (!created) throw new ValidationError("SenecAI did not open that workspace.");
  const { name, adminName, adminEmail } = created.after as { name: string; adminName: string; adminEmail: string };
  return withTenant({ userId: vendor.userId, orgId: firmId }, async (tx: Tx) => {
    if (await tx.membership.count({ where: { organizationId: firmId } })) {
      throw new ForbiddenError("The firm's admin has already joined. New invitations now come from the firm itself.");
    }
    const { invitation, token } = await createInvitation(tx, inviterIn(vendor, firmId), { name: adminName, email: adminEmail, role: "ORG_ADMIN" });
    const email = await emailInvitation(tx, invitation, token, { organizationName: name });
    return { token, email };
  });
}
