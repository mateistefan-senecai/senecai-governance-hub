import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canAdmin, requireClient } from "@/lib/authz";
import { receivesDemoRequests } from "@/lib/services/demo-requests";
import {
  assignReviewerAction,
  inviteAction,
  renewInviteAction,
  revokeInviteAction,
  setClientPilotAction,
} from "@/lib/actions/invitations";
import { InviteForm, RenewLink } from "@/components/invite-form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeading } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { MEMBER_ROLE_LABEL, formatDate } from "@/lib/labels";

/**
 * Who works on this client: the company's own users, the reviewers assigned
 * to it and the organisation's admins. Everyone with access can invite the
 * people their role allows (docs/backlog.md, 26 Nov 2026).
 */
export default async function ClientTeamPage({ params }: PageProps<"/clients/[clientId]/team">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const back = `/clients/${clientId}/team`;
  const data = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    const members = await tx.membership.findMany({
      where: {
        organizationId: ctx.orgId,
        OR: [{ role: "ORG_ADMIN" }, { clientId: client.id }, { assignments: { some: { clientId: client.id } } }],
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    const unassigned = canAdmin(ctx)
      ? await tx.membership.findMany({
          where: { organizationId: ctx.orgId, role: "REVIEWER", assignments: { none: { clientId: client.id } } },
          include: { user: { select: { name: true } } },
        })
      : [];
    const pending = await tx.invitation.findMany({
      where: { clientId: client.id, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const isVendor = canAdmin(ctx) && (await receivesDemoRequests(tx, ctx.orgId));
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { pilot: true } });
    return { client, members, unassigned, pending, isVendor, orgPilot: org.pilot };
  });
  const { client, members, unassigned, pending, isVendor, orgPilot } = data;
  const order = { COMPANY_USER: 0, REVIEWER: 1, ORG_ADMIN: 2 } as const;
  members.sort((a, b) => order[a.role] - order[b.role]);

  // What this viewer may invite for this client.
  const roles =
    ctx.role === "ORG_ADMIN"
      ? [
          { value: "COMPANY_USER", label: `Company user at ${client.name}`, hint: "Fills in the inventory and questionnaires; cannot approve documents." },
          { value: "REVIEWER", label: "Reviewer for this client", hint: "A consultant or lawyer of your organisation: reviews, overrides and approves for this client." },
        ]
      : [{ value: "COMPANY_USER", label: `Colleague at ${client.name}` }];

  return (
    <>
      <PageHeader
        crumb={`${client.name} · Team`}
        title="Team"
        subtitle={
          ctx.role === "COMPANY_USER"
            ? "Who works on your company's AI Act compliance. Invite colleagues who should fill in the inventory with you."
            : "Who works on this client. Invite the company's people, and assign reviewers."
        }
      />
      <div className="grid gap-6 p-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel padded={false}>
            <PanelHeading title="People with access" kicker={`${members.length} ${members.length === 1 ? "person" : "people"}`} />
            <ul className="divide-y divide-hairline-light">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px]">
                  <span>
                    <span className="font-semibold text-ink">{m.user.name}</span>
                    <span className="ml-2 text-muted">{m.user.email}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Tag tone={m.role === "COMPANY_USER" ? "outline" : "muted"}>
                      {m.role === "ORG_ADMIN" ? "Admin · all clients" : MEMBER_ROLE_LABEL[m.role]}
                    </Tag>
                    {canAdmin(ctx) && m.role === "REVIEWER" && (
                      <form action={assignReviewerAction.bind(null, client.id)}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <input type="hidden" name="assigned" value="false" />
                        <Button size="sm">Remove</Button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {pending.length > 0 && (
            <Panel padded={false}>
              <PanelHeading title="Invitations not yet accepted" />
              <ul className="divide-y divide-hairline-light">
                {pending.map((inv) => (
                  <li key={inv.id} className="space-y-2 px-5 py-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        <span className="font-semibold text-ink">{inv.name}</span>
                        <span className="ml-2 text-muted">{inv.email}</span>
                        <span className="ml-2 text-[12px] text-muted">
                          · {MEMBER_ROLE_LABEL[inv.role]} · invited by {inv.invitedByName} on {formatDate(inv.createdAt)} ·{" "}
                          {inv.expiresAt < new Date() ? "link expired" : `link valid until ${formatDate(inv.expiresAt)}`}
                          {inv.emailStatus === "sent" ? " · emailed" : " · not emailed"}
                        </span>
                      </span>
                      <form action={revokeInviteAction.bind(null, inv.id, back)}>
                        <Button size="sm">Withdraw</Button>
                      </form>
                    </div>
                    <RenewLink action={renewInviteAction} fields={{ invitationId: inv.id, back }} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel>
            <h2 className="text-[15px] font-semibold text-ink">Invite someone</h2>
            <p className="mb-4 mt-1 text-[13px] text-muted">
              They get an email with a link to set their password. If email is not set up yet, you get the link to send yourself.
            </p>
            <InviteForm action={inviteAction} roles={roles} clientId={client.id} back={back} />
          </Panel>

          {canAdmin(ctx) && unassigned.length > 0 && (
            <Panel>
              <h2 className="text-[15px] font-semibold text-ink">Assign a reviewer</h2>
              <p className="mt-1 text-[13px] text-muted">A reviewer of your organisation who already has an account.</p>
              <form action={assignReviewerAction.bind(null, client.id)} className="mt-4 flex gap-2">
                <select name="membershipId" required className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px]">
                  {unassigned.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
                <Button variant="primary">Assign</Button>
              </form>
            </Panel>
          )}

          {isVendor && (
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-ink">Pilot client</h2>
                {client.pilot && <Tag tone="prelim">Pilot</Tag>}
              </div>
              <p className="mt-1 text-[13px] text-muted">
                PDFs of a pilot client carry a watermark on every page: &ldquo;Test version – not legal advice&rdquo;. It applies to PDFs generated after the change.
              </p>
              <form action={setClientPilotAction.bind(null, client.id)} className="mt-4">
                <input type="hidden" name="pilot" value={client.pilot ? "false" : "true"} />
                <Button variant={client.pilot ? "ghost" : "primary"}>{client.pilot ? "End the pilot for this client" : "Mark as pilot client"}</Button>
              </form>
            </Panel>
          )}
          {orgPilot && !isVendor && (
            <Panel>
              <h2 className="text-[15px] font-semibold text-ink">Pilot</h2>
              <p className="mt-1 text-[13px] text-muted">
                Your organisation is in the pilot: every PDF carries a &ldquo;Test version – not legal advice&rdquo; watermark.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
