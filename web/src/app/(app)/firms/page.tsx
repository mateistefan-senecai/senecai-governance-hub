import { notFound } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canAdmin } from "@/lib/authz";
import { receivesDemoRequests } from "@/lib/services/demo-requests";
import { listFirms } from "@/lib/services/firms";
import { createFirmAction, renewFirmInviteAction } from "@/lib/actions/invitations";
import { FirmForm } from "@/components/firm-form";
import { RenewLink } from "@/components/invite-form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeading } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/labels";

/**
 * SenecAI only: open a workspace for a law firm and invite its first admin.
 * Once the firm has joined, SenecAI sees nothing of it but its name here.
 */
export default async function FirmsPage() {
  const ctx = await getCtx();
  if (!canAdmin(ctx) || !(await withTenant(ctx, (tx) => receivesDemoRequests(tx, ctx.orgId)))) notFound();
  const firms = await listFirms({ ...ctx, role: ctx.role });

  return (
    <>
      <PageHeader
        crumb="SenecAI · Hub vendor"
        title="Law firm workspaces"
        subtitle="Open a workspace for a law firm that uses the Hub for its own clients. The firm's data is never visible to SenecAI: once its admin joins, the firm invites its own people."
        actions={<Button href="/clients">← Clients</Button>}
      />
      <div className="grid gap-6 p-8 xl:grid-cols-[1.3fr_1fr]">
        <Panel padded={false} className="self-start">
          <PanelHeading title="Workspaces opened by SenecAI" kicker={`${firms.length}`} />
          {firms.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-muted">None yet.</p>
          ) : (
            <ul className="divide-y divide-hairline-light">
              {firms.map((f) => (
                <li key={f.id} className="space-y-2 px-5 py-3 text-[13px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      <span className="font-semibold text-ink">{f.name}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        Admin: {f.adminName} · {f.adminEmail} · opened {formatDate(f.createdAt)}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      {f.pilot && <Tag tone="prelim">Pilot</Tag>}
                      <Tag tone={f.joined ? "outline" : "muted"}>{f.joined ? "Admin joined" : "Waiting for the admin"}</Tag>
                    </span>
                  </div>
                  {!f.joined && <RenewLink action={renewFirmInviteAction} fields={{ firmId: f.id }} label="New link for the admin" />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="self-start">
          <h2 className="text-[15px] font-semibold text-ink">Open a workspace</h2>
          <p className="mb-4 mt-1 text-[13px] text-muted">The firm&rsquo;s first admin gets an invitation. They add the firm&rsquo;s clients, lawyers and logo themselves.</p>
          <FirmForm action={createFirmAction} />
        </Panel>
      </div>
    </>
  );
}
