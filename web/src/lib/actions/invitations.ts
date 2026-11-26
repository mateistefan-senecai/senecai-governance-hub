"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getCtx, type Ctx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { ForbiddenError, assertAdmin, requireClient } from "@/lib/authz";
import { ValidationError } from "@/lib/services/classification";
import { receivesDemoRequests } from "@/lib/services/demo-requests";
import { audit } from "@/lib/services/audit";
import {
  acceptInvitation,
  createInvitation,
  emailInvitation,
  invitationLink,
  renewInvitation,
  revokeInvitation,
  setAssignment,
  type Inviter,
} from "@/lib/services/invitations";
import { createFirm, renewFirmInvitation } from "@/lib/services/firms";
import { actor, run, str } from "./run";

/** What an invite form shows after sending: the link to pass on when no email went out. */
export type InviteState = { ok: boolean; error?: string; name?: string; email?: string; link?: string; emailed?: boolean };

const inviterOf = (ctx: Ctx): Inviter => ({ ...actor(ctx), role: ctx.role, membershipId: ctx.membershipId, clientId: ctx.clientId });

async function expected<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ValidationError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
}

/** Invite someone into the organisation (team page) or a client (client team page). */
export async function inviteAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const ctx = await getCtx();
  const input = { name: str(form, "name"), email: str(form, "email"), role: str(form, "role") as never, clientId: str(form, "clientId") };
  const result = await expected(() =>
    withTenant(ctx, async (tx) => {
      const { invitation, token } = await createInvitation(tx, inviterOf(ctx), input);
      const client = invitation.clientId ? await tx.client.findUnique({ where: { id: invitation.clientId }, select: { name: true } }) : null;
      const email = await emailInvitation(tx, invitation, token, { organizationName: ctx.orgName, clientName: client?.name });
      return { invitation, token, emailed: email.status === "sent" };
    }),
  );
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath(str(form, "back") || "/team");
  return { ok: true, name: result.invitation.name, email: result.invitation.email, link: invitationLink(result.token), emailed: result.emailed };
}

/** A new link for a pending invitation; the old link stops working. */
export async function renewInviteAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const ctx = await getCtx();
  const result = await expected(() =>
    withTenant(ctx, async (tx) => {
      const { invitation, token } = await renewInvitation(tx, inviterOf(ctx), str(form, "invitationId"));
      const client = invitation.clientId ? await tx.client.findUnique({ where: { id: invitation.clientId }, select: { name: true } }) : null;
      const email = await emailInvitation(tx, invitation, token, { organizationName: ctx.orgName, clientName: client?.name });
      return { invitation, token, emailed: email.status === "sent" };
    }),
  );
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath(str(form, "back") || "/team");
  return { ok: true, name: result.invitation.name, email: result.invitation.email, link: invitationLink(result.token), emailed: result.emailed };
}

export async function revokeInviteAction(invitationId: string, back: string) {
  const ctx = await getCtx();
  await run(back, async () => {
    await withTenant(ctx, (tx) => revokeInvitation(tx, inviterOf(ctx), invitationId));
    return { notice: "Invitation withdrawn. Its link no longer works." };
  });
}

/** Admin: give an existing reviewer access to a client, or take it away. */
export async function assignReviewerAction(clientId: string, form: FormData) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/team`;
  await run(back, async () => {
    const membershipId = str(form, "membershipId");
    const assigned = str(form, "assigned") !== "false";
    if (!membershipId) throw new ValidationError("Choose a reviewer.");
    await withTenant(ctx, (tx) => setAssignment(tx, inviterOf(ctx), clientId, membershipId, assigned));
    return { notice: assigned ? "Reviewer assigned to this client." : "Reviewer removed from this client." };
  });
}

/** SenecAI's admins: mark a client as a pilot (test) client, whose PDFs carry a test watermark. */
export async function setClientPilotAction(clientId: string, form: FormData) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/team`;
  await run(back, async () => {
    assertAdmin(ctx);
    const pilot = str(form, "pilot") === "true";
    await withTenant(ctx, async (tx) => {
      if (!(await receivesDemoRequests(tx, ctx.orgId))) throw new ForbiddenError("Only SenecAI marks pilot clients.");
      const client = await requireClient(tx, ctx, clientId);
      await tx.client.update({ where: { id: client.id }, data: { pilot } });
      await audit(tx, actor(ctx), { entityType: "Client", entityId: client.id, action: "client.pilot", before: { pilot: client.pilot }, after: { pilot } });
    });
    return {
      notice: pilot
        ? "Marked as a pilot client. PDFs generated from now on carry the test-version watermark."
        : "No longer a pilot client. PDFs generated from now on have no test watermark.",
    };
  });
}

// ── Accepting (public: /invite/[token]) ────────────────────────────────────

export type AcceptState = { error?: string };

export async function acceptInviteAction(token: string, _prev: AcceptState, form: FormData): Promise<AcceptState> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const confirm = form.get("confirm");
  let email: string;
  try {
    ({ email } = await acceptInvitation(token, {
      name: str(form, "name"),
      password,
      confirm: typeof confirm === "string" ? confirm : undefined,
    }));
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message };
    throw e;
  }
  try {
    await signIn("credentials", { email, password, redirectTo: "/home" });
  } catch (e) {
    // signIn redirects by throwing; only an auth failure is handled here.
    if (e instanceof AuthError) return { error: "Your access is ready, but signing in failed. Sign in from the login page." };
    throw e;
  }
  return {};
}

// ── Firm workspaces (SenecAI only) ────────────────────────────────────────

export async function createFirmAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const ctx = await getCtx();
  const result = await expected(() =>
    createFirm(
      { ...actor(ctx), role: ctx.role },
      { name: str(form, "name"), adminName: str(form, "adminName"), adminEmail: str(form, "adminEmail"), pilot: str(form, "pilot") === "on" },
    ),
  );
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/firms");
  return { ok: true, name: str(form, "adminName"), email: str(form, "adminEmail").toLowerCase(), link: invitationLink(result.token), emailed: result.email.status === "sent" };
}

export async function renewFirmInviteAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const ctx = await getCtx();
  const result = await expected(() => renewFirmInvitation({ ...actor(ctx), role: ctx.role }, str(form, "firmId")));
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/firms");
  return { ok: true, link: invitationLink(result.token), emailed: result.email.status === "sent" };
}
