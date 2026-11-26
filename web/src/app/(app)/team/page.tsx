import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { canAdmin } from "@/lib/authz";
import { inviteAction, renewInviteAction, revokeInviteAction } from "@/lib/actions/invitations";
import { InviteForm, RenewLink } from "@/components/invite-form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeading } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { MEMBER_ROLE_LABEL, ORG_TYPE_LABEL, formatDate } from "@/lib/labels";

/** Admin: everyone in the organisation, pending invitations, and inviting admins, reviewers and company users. */
export default async function TeamPage() {
  const ctx = await getCtx();
  if (!canAdmin(ctx)) notFound();
  const { members, pending, clients } = await withTenant(ctx, async (tx) => ({
    members: await tx.membership.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { id: true, name: true } },
        assignments: { include: { client: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    pending: await tx.invitation.findMany({
      where: { acceptedAt: null, revokedAt: null },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    clients: await tx.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  }));

  return (
    <>
      <PageHeader
        crumb={`${ctx.orgName} · ${ORG_TYPE_LABEL[ctx.orgType]}`}
        title="Team"
        subtitle="Everyone with access to your organisation. Admins see every client; reviewers see the clients assigned to them; company users see their own company."
        actions={<Button href="/clients">← Clients</Button>}
      />
      <div className="grid gap-6 p-8 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel padded={false}>
            <PanelHeading title="Members" kicker={`${members.length}`} />
            <ul className="divide-y divide-hairline-light">
              {members.map((m) => {
                const where =
                  m.role === "ORG_ADMIN"
                    ? [{ id: "", name: "All clients" }]
                    : m.role === "COMPANY_USER"
                      ? m.client
                        ? [m.client]
                        : []
                      : m.assignments.map((a) => a.client);
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px]">
                    <span>
                      <span className="font-semibold text-ink">{m.user.name}</span>
                      <span className="ml-2 text-muted">{m.user.email}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {where.length === 0
                          ? "No client assigned yet"
                          : where.map((c, i) => (
                              <span key={c.id || i}>
                                {i > 0 && ", "}
                                {c.id ? (
                                  <Link href={`/clients/${c.id}/team`} className="underline-offset-2 hover:underline">
                                    {c.name}
                                  </Link>
                                ) : (
                                  c.name
                                )}
                              </span>
                            ))}
                      </span>
                    </span>
                    <Tag tone={m.role === "ORG_ADMIN" ? "ink-fill" : "outline"}>{MEMBER_ROLE_LABEL[m.role]}</Tag>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {pending.length > 0 && (
            <Panel padded={false}>
              <PanelHeading title="Invitations not yet accepted" kicker={`${pending.length}`} />
              <ul className="divide-y divide-hairline-light">
                {pending.map((inv) => (
                  <li key={inv.id} className="space-y-2 px-5 py-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        <span className="font-semibold text-ink">{inv.name}</span>
                        <span className="ml-2 text-muted">{inv.email}</span>
                        <span className="mt-0.5 block text-[12px] text-muted">
                          {MEMBER_ROLE_LABEL[inv.role]}
                          {inv.client ? ` · ${inv.client.name}` : ""} · invited by {inv.invitedByName} on {formatDate(inv.createdAt)} ·{" "}
                          {inv.expiresAt < new Date() ? "link expired" : `valid until ${formatDate(inv.expiresAt)}`}
                          {inv.emailStatus === "sent" ? " · emailed" : " · not emailed"}
                        </span>
                      </span>
                      <form action={revokeInviteAction.bind(null, inv.id, "/team")}>
                        <Button size="sm">Withdraw</Button>
                      </form>
                    </div>
                    <RenewLink action={renewInviteAction} fields={{ invitationId: inv.id, back: "/team" }} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <Panel className="self-start">
          <h2 className="text-[15px] font-semibold text-ink">Invite someone</h2>
          <p className="mb-4 mt-1 text-[13px] text-muted">
            They get an email with a link to set their password. If email is not set up yet, you get the link to send yourself.
          </p>
          <InviteForm
            action={inviteAction}
            back="/team"
            clients={clients.map((c) => ({ value: c.id, label: c.name }))}
            roles={[
              { value: "REVIEWER", label: "Reviewer", hint: "A consultant or lawyer: reviews, overrides and approves for the clients assigned to them." },
              { value: "COMPANY_USER", label: "Company user", hint: "A person at the client company: fills in the inventory and questionnaires; cannot approve." },
              { value: "ORG_ADMIN", label: "Admin", hint: "Sees every client, invites people, sets branding, and can do everything a reviewer can." },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
