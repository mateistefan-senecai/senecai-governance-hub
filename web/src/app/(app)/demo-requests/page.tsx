import { notFound } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canAdmin } from "@/lib/authz";
import { removeDemoRequest, updateDemoRequestStatus } from "@/lib/actions/demo-requests";
import { DEMO_STATUS_LABEL, REQUESTER_TYPE_LABEL, receivesDemoRequests } from "@/lib/services/demo-requests";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";

/**
 * Demo requests sent from the public landing page. Only the admins of the
 * organisation that receives them (SenecAI) can open this; for everyone
 * else it does not exist. The database enforces the same rule.
 */
export default async function DemoRequestsPage() {
  const ctx = await getCtx();
  if (!canAdmin(ctx)) notFound();
  const data = await withTenant(ctx, async (tx) => {
    if (!(await receivesDemoRequests(tx, ctx.orgId))) return null;
    return tx.demoRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  });
  if (!data) notFound();
  const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

  return (
    <>
      <PageHeader
        crumb={`${ctx.orgName} · Landing page`}
        title="Demo requests"
        subtitle="Requests sent through the Request a demo form. They hold personal data: delete a request when it is no longer needed, or when the person asks."
      />
      <div className="space-y-4 p-8">
        {data.length === 0 ? (
          <Panel>
            <p className="text-[13.5px] text-muted">No demo requests yet.</p>
          </Panel>
        ) : (
          data.map((r) => (
            <Panel key={r.id} className={r.status === "CLOSED" ? "opacity-70" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-ink">{r.name}</h2>
                    <Tag tone={r.status === "NEW" ? "gold-fill" : "muted"}>{DEMO_STATUS_LABEL[r.status]}</Tag>
                  </div>
                  <p className="mt-0.5 text-[13px] text-body">
                    {r.role ? `${r.role}, ` : ""}
                    {r.organization} · {REQUESTER_TYPE_LABEL[r.requesterType]}
                  </p>
                  <p className="mt-0.5 text-[13px]">
                    <a href={`mailto:${r.email}`} className="font-semibold text-gold-hover underline-offset-2 hover:underline">
                      {r.email}
                    </a>
                  </p>
                </div>
                <div className="text-right text-[12px] text-label">
                  <p>Received {fmt.format(r.createdAt)}</p>
                  {r.handledByName && r.handledAt && (
                    <p>
                      {DEMO_STATUS_LABEL[r.status]} by {r.handledByName}, {fmt.format(r.handledAt)}
                    </p>
                  )}
                </div>
              </div>
              {r.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-panel px-4 py-3 text-[13.5px] leading-relaxed text-body">{r.message}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(["NEW", "CONTACTED", "CLOSED"] as const)
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <form key={s} action={updateDemoRequestStatus.bind(null, r.id)}>
                      <input type="hidden" name="status" value={s} />
                      <Button size="sm" variant={s === "CONTACTED" ? "primary" : "ghost"}>
                        Mark {DEMO_STATUS_LABEL[s].toLowerCase()}
                      </Button>
                    </form>
                  ))}
                <form action={removeDemoRequest.bind(null, r.id)} className="ml-auto">
                  <Button size="sm" variant="ghost" className="text-red-800">
                    Delete
                  </Button>
                </form>
              </div>
            </Panel>
          ))
        )}
      </div>
    </>
  );
}
