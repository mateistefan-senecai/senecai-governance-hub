// User invitations (decided 26 Nov 2026, docs/backlog.md):
//   - an org admin invites anyone into the organisation;
//   - a reviewer invites company users for the clients assigned to them;
//   - a company user invites colleagues for their own company.
// The invitee gets a link by email; until an email provider is configured,
// the inviter sees the link and sends it by hand. The link carries a random
// token; only its SHA-256 is stored.

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Tx } from "@/lib/tenant";
import { withInviteToken } from "@/lib/tenant";
import type { MemberRole } from "@/generated/prisma/enums";
import { appUrl, sendEmail, type EmailResult } from "@/lib/email";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";
import { ForbiddenError } from "@/lib/authz";

/** How long an invitation link stays valid. */
export const INVITATION_DAYS = 14;
export const MIN_PASSWORD_LENGTH = 10;

/** The person inviting: who they are and what they may do in the organisation. */
export type Inviter = Actor & { role: MemberRole; membershipId: string; clientId: string | null };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const invitationLink = (token: string) => `${appUrl()}/invite/${token}`;

const inputSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's name.").max(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address.")),
  role: z.enum(["ORG_ADMIN", "REVIEWER", "COMPANY_USER"], "Choose a role."),
  clientId: z.string().trim().optional().transform((v) => v || null),
});
export type InvitationInput = z.input<typeof inputSchema>;

/**
 * Whether `inviter` may invite someone with `role` for `clientId`. Throws a
 * ForbiddenError or ValidationError explaining why not.
 */
export async function assertMayInvite(tx: Tx, inviter: Inviter, role: MemberRole, clientId: string | null) {
  if (role === "COMPANY_USER" && !clientId) throw new ValidationError("Choose the company this person works for.");
  if (role === "ORG_ADMIN" && clientId) throw new ValidationError("An admin works across every client; leave the client empty.");
  if (clientId) {
    // RLS keeps this inside the organisation; the role rules narrow it further.
    const client = await tx.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new ValidationError("That client does not exist.");
  }
  if (inviter.role === "ORG_ADMIN") return;
  if (role !== "COMPANY_USER") throw new ForbiddenError("Only an organisation admin can invite reviewers and admins.");
  if (inviter.role === "COMPANY_USER") {
    if (clientId !== inviter.clientId) throw new ForbiddenError("You can only invite colleagues from your own company.");
    return;
  }
  // REVIEWER: only for the clients assigned to them.
  const assigned = await tx.clientAssignment.count({ where: { clientId: clientId!, membershipId: inviter.membershipId } });
  if (!assigned) throw new ForbiddenError("You can only invite people for the clients assigned to you.");
}

/**
 * Creates an invitation and returns its one-time token. Any earlier pending
 * invitation for the same email in this organisation is revoked, so only the
 * newest link works.
 */
export async function createInvitation(tx: Tx, inviter: Inviter, input: InvitationInput, now = new Date()) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  const { name, email, role, clientId } = parsed.data;
  await assertMayInvite(tx, inviter, role, clientId);

  const existing = await tx.membership.findFirst({
    where: { organizationId: inviter.orgId, user: { email } },
    select: { role: true, clientId: true },
  });
  if (existing) {
    throw new ValidationError(
      role === "REVIEWER" && existing.role === "REVIEWER"
        ? `${email} is already a reviewer here. Assign them to the client from the Team page instead.`
        : `${email} already has access to this organisation.`,
    );
  }

  await tx.invitation.updateMany({
    where: { organizationId: inviter.orgId, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });
  const token = randomBytes(32).toString("base64url");
  const invitation = await tx.invitation.create({
    data: {
      organizationId: inviter.orgId,
      email,
      name,
      role,
      clientId,
      tokenHash: hashToken(token),
      invitedById: inviter.userId,
      invitedByName: inviter.userName,
      expiresAt: new Date(now.getTime() + INVITATION_DAYS * 86_400_000),
    },
  });
  // The audit log keeps the role and client, not the invitee's address.
  await audit(tx, inviter, { entityType: "Invitation", entityId: invitation.id, action: "invitation.created", after: { role, clientId } });
  return { invitation, token };
}

/** Pending invitations the inviter may manage: all (admin), their clients' (reviewer), their company's (company user). */
async function requireManageable(tx: Tx, inviter: Inviter, invitationId: string) {
  const inv = await tx.invitation.findUnique({ where: { id: invitationId } });
  if (!inv || inv.acceptedAt || inv.revokedAt) throw new ValidationError("That invitation is no longer pending.");
  await assertMayInvite(tx, inviter, inv.role, inv.clientId);
  return inv;
}

/** A fresh link for a pending invitation (the old one stops working). */
export async function renewInvitation(tx: Tx, inviter: Inviter, invitationId: string, now = new Date()) {
  const inv = await requireManageable(tx, inviter, invitationId);
  const token = randomBytes(32).toString("base64url");
  const invitation = await tx.invitation.update({
    where: { id: inv.id },
    data: { tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + INVITATION_DAYS * 86_400_000), emailStatus: null },
  });
  await audit(tx, inviter, { entityType: "Invitation", entityId: inv.id, action: "invitation.renewed" });
  return { invitation, token };
}

export async function revokeInvitation(tx: Tx, inviter: Inviter, invitationId: string, now = new Date()) {
  const inv = await requireManageable(tx, inviter, invitationId);
  await tx.invitation.update({ where: { id: inv.id }, data: { revokedAt: now } });
  await audit(tx, inviter, { entityType: "Invitation", entityId: inv.id, action: "invitation.revoked" });
}

/** Emails the link. Never throws: the inviter can always copy the link instead. */
export async function emailInvitation(
  tx: Tx,
  invitation: { id: string; email: string; name: string; invitedByName: string },
  token: string,
  where: { organizationName: string; clientName?: string | null },
): Promise<EmailResult> {
  const place = where.clientName ? `${where.clientName}'s AI Act workspace` : where.organizationName;
  const result = await sendEmail({
    to: [invitation.email],
    subject: `${invitation.invitedByName} invited you to the Governance Hub`,
    text: [
      `Hello ${invitation.name},`,
      "",
      `${invitation.invitedByName} invited you to ${place} in the SenecAI Governance Hub (EU AI Act).`,
      "",
      `Set your password and sign in here (the link is valid for ${INVITATION_DAYS} days):`,
      invitationLink(token),
      "",
      "If you were not expecting this, you can ignore this email.",
    ].join("\n"),
  });
  await tx.invitation.update({
    where: { id: invitation.id },
    data: { emailStatus: result.status === "sent" ? "sent" : `${result.status}: ${result.detail ?? ""}`.trim() },
  });
  return result;
}

// ── Accepting ─────────────────────────────────────────────────────────────

export type InvitationView = {
  name: string;
  email: string;
  role: MemberRole;
  organizationName: string;
  clientName: string | null;
  invitedByName: string;
  /** The email already has an account: they confirm with its password. */
  hasAccount: boolean;
  problem: null | "expired" | "used" | "revoked";
};

/** What the invitation page shows. Null when the token matches nothing. */
export async function viewInvitation(token: string, now = new Date()): Promise<InvitationView | null> {
  return withInviteToken(hashToken(token), async (tx, enter) => {
    const inv = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!inv) return null;
    await enter({ userId: "invitation", orgId: inv.organizationId });
    const org = await tx.organization.findUniqueOrThrow({ where: { id: inv.organizationId }, select: { brandName: true, name: true } });
    const client = inv.clientId ? await tx.client.findUnique({ where: { id: inv.clientId }, select: { name: true } }) : null;
    const hasAccount = (await tx.user.count({ where: { email: inv.email } })) > 0;
    return {
      name: inv.name,
      email: inv.email,
      role: inv.role,
      organizationName: org.brandName ?? org.name,
      clientName: client?.name ?? null,
      invitedByName: inv.invitedByName,
      hasAccount,
      problem: inv.acceptedAt ? "used" : inv.revokedAt ? "revoked" : inv.expiresAt < now ? "expired" : null,
    };
  });
}

/**
 * Accepts an invitation: creates the account (or checks the existing
 * account's password), the membership and, for a reviewer, the assignment
 * to the client. All in one transaction. Returns the email to sign in with.
 */
export async function acceptInvitation(
  token: string,
  input: { name?: string; password: string; confirm?: string },
  now = new Date(),
): Promise<{ email: string }> {
  return withInviteToken(hashToken(token), async (tx, enter) => {
    const inv = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!inv || inv.acceptedAt || inv.revokedAt) throw new ValidationError("This invitation link is no longer valid. Ask for a new one.");
    if (inv.expiresAt < now) throw new ValidationError("This invitation link has expired. Ask for a new one.");

    let user = await tx.user.findUnique({ where: { email: inv.email } });
    if (user) {
      if (!(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new ValidationError("That is not the password of your existing account.");
      }
    } else {
      const name = (input.name ?? "").trim() || inv.name;
      if (input.password.length < MIN_PASSWORD_LENGTH) {
        throw new ValidationError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (input.confirm !== undefined && input.confirm !== input.password) throw new ValidationError("The two passwords do not match.");
      user = await tx.user.create({ data: { email: inv.email, name, passwordHash: await bcrypt.hash(input.password, 10) } });
    }

    await enter({ userId: user.id, orgId: inv.organizationId });
    if (await tx.membership.count({ where: { userId: user.id, organizationId: inv.organizationId } })) {
      throw new ValidationError("You already have access to this organisation. Sign in instead.");
    }
    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: inv.organizationId,
        role: inv.role,
        clientId: inv.role === "COMPANY_USER" ? inv.clientId : null,
      },
    });
    if (inv.role === "REVIEWER" && inv.clientId) {
      await tx.clientAssignment.create({ data: { organizationId: inv.organizationId, clientId: inv.clientId, membershipId: membership.id } });
    }
    await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: now } });
    await audit(tx, { userId: user.id, userName: user.name, orgId: inv.organizationId }, {
      entityType: "Invitation",
      entityId: inv.id,
      action: "invitation.accepted",
      after: { role: inv.role, clientId: inv.clientId, membershipId: membership.id },
    });
    return { email: user.email };
  });
}

// ── Team ──────────────────────────────────────────────────────────────────

/** Admin only: give a reviewer access to a client, or take it away. */
export async function setAssignment(tx: Tx, admin: Inviter, clientId: string, membershipId: string, assigned: boolean) {
  if (admin.role !== "ORG_ADMIN") throw new ForbiddenError("Only an organisation admin can assign reviewers.");
  const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId: admin.orgId, role: "REVIEWER" } });
  if (!member) throw new ValidationError("That person is not a reviewer in this organisation.");
  const client = await tx.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new ValidationError("That client does not exist.");
  if (assigned) {
    await tx.clientAssignment.upsert({
      where: { clientId_membershipId: { clientId, membershipId } },
      create: { organizationId: admin.orgId, clientId, membershipId },
      update: {},
    });
  } else {
    await tx.clientAssignment.deleteMany({ where: { clientId, membershipId } });
  }
  await audit(tx, admin, { entityType: "Client", entityId: clientId, action: assigned ? "reviewer.assigned" : "reviewer.unassigned", after: { membershipId } });
}
