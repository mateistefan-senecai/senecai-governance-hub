import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { getContentVersion } from "@/lib/content/current";
import { readiness } from "@/lib/services/assessment";
import { requestImplementation, updateAction } from "@/lib/actions/roadmap";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ACTION_STATUS_LABEL, EFFORT_LABEL, OBLIGATION_STATUS_LABEL, formatDate } from "@/lib/labels";
import type { ContentBundle } from "@/lib/content/types";

const PHASES = [
  { n: 1, title: "Phase 1 — now", hint: "Already applies, or applies within six months." },
  { n: 2, title: "Phase 2 — next", hint: "Applies within 18 months, or a small piece of work." },
  { n: 3, title: "Phase 3 — later", hint: "Larger work with a later application date." },
];

export default async function RoadmapPage({ params }: PageProps<"/clients/[clientId]/roadmap">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const { actions, obligations, bundles, enquiries } = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    const actions = await tx.action.findMany({
      where: { clientId: client.id },
      include: { systemObligation: { include: { system: { select: { id: true, name: true } } } }, enquiry: true },
      orderBy: [{ phase: "asc" }, { createdAt: "asc" }],
    });
    const obligations = await tx.systemObligation.findMany({
      where: { system: { clientId: client.id } },
      select: { status: true, active: true },
    });
    const versions = [...new Set(actions.map((a) => a.systemObligation.contentVersion))];
    const bundles = new Map<string, ContentBundle>();
    for (const v of versions) bundles.set(v, await getContentVersion(tx, v));
    const enquiries = await tx.enquiry.findMany({ where: { clientId: client.id }, include: { actions: true }, orderBy: { createdAt: "desc" } });
    return { client, actions, obligations, bundles, enquiries };
  });

  const open = actions.filter((a) => a.status !== "DONE");
  const done = actions.filter((a) => a.status === "DONE");
  const requestable = open.filter((a) => !a.enquiryId);
  const article = (a: (typeof actions)[number]) =>
    bundles.get(a.systemObligation.contentVersion)?.obligations.find((o) => o.key === a.systemObligation.obligationKey)?.article;

  return (
    <>
      <PageHeader
        crumb="Step 6 · Compliance roadmap"
        title="Compliance roadmap"
        subtitle="Every gap or partial obligation becomes an action, grouped by urgency. The roadmap is complete on its own; asking for implementation help is optional."
      />
      <div className="flex flex-wrap items-end justify-end gap-10 border-b border-hairline bg-ground px-8 py-4">
        <StatTile label="Open actions" value={open.length} />
        <StatTile label="Legal" value={open.filter((a) => a.type === "LEGAL").length} />
        <StatTile label="Technical" value={open.filter((a) => a.type === "TECHNICAL").length} />
        <StatTile label="Closed" value={done.length} />
        <div className="w-40">
          <p className="text-right font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Readiness</p>
          <div className="mt-1.5">
            <ProgressBar percent={readiness(obligations)} showLabel />
          </div>
        </div>
      </div>

      <div className="space-y-8 p-8">
        {actions.length === 0 && (
          <Panel>
            <p className="text-[13.5px] text-muted">
              No actions yet. They appear when a reviewer assesses an obligation as partial or gap.
            </p>
          </Panel>
        )}

        {PHASES.map((phase) => {
          const items = open.filter((a) => a.phase === phase.n);
          if (!items.length) return null;
          return (
            <section key={phase.n}>
              <h2 className="text-[16px] font-semibold text-ink">{phase.title}</h2>
              <p className="mb-3 text-[12.5px] text-muted">{phase.hint}</p>
              <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
                <ul className="divide-y divide-hairline-light">
                  {items.map((a) => (
                    <li key={a.id} id={a.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] target:bg-gold-tint/40">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag tone={a.type === "LEGAL" ? "outline" : "ink-fill"}>{a.type === "LEGAL" ? "Legal" : "Technical"}</Tag>
                          <span className="text-[11.5px] text-muted">{EFFORT_LABEL[a.effort]} effort</span>
                          {a.enquiry && <Tag tone="prelim">Help requested</Tag>}
                        </div>
                        <p className="mt-1.5 text-[14px] font-semibold text-ink">{a.title}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          <Link
                            href={`/clients/${clientId}/systems/${a.systemObligation.system.id}/obligations/${a.systemObligationId}`}
                            className="underline-offset-2 hover:text-gold-hover hover:underline"
                          >
                            {article(a)} · {a.systemObligation.system.name}
                          </Link>{" "}
                          · {OBLIGATION_STATUS_LABEL[a.systemObligation.status]} · applies from {formatDate(a.systemObligation.appliesFrom)}
                        </p>
                      </div>
                      <form action={updateAction.bind(null, clientId, a.id)} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 text-[12px]">
                        <label className="block">
                          <span className="text-label">Owner</span>
                          <input name="ownerName" defaultValue={a.ownerName ?? ""} className="mt-0.5 block w-full rounded-md border border-hairline bg-surface px-2 py-1" />
                        </label>
                        <label className="block">
                          <span className="text-label">Deadline</span>
                          <input
                            type="date"
                            name="dueDate"
                            defaultValue={a.dueDate ? a.dueDate.toISOString().slice(0, 10) : ""}
                            className="mt-0.5 block rounded-md border border-hairline bg-surface px-2 py-1"
                          />
                        </label>
                        <label className="block">
                          <span className="text-label">Status</span>
                          <select name="status" defaultValue={a.status} className="mt-0.5 block rounded-md border border-hairline bg-surface px-2 py-1">
                            <option value="OPEN">{ACTION_STATUS_LABEL.OPEN}</option>
                            <option value="IN_PROGRESS">{ACTION_STATUS_LABEL.IN_PROGRESS}</option>
                          </select>
                        </label>
                        <Button size="sm">Save</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

        {requestable.length > 0 && (
          <Panel className="max-w-3xl">
            <h2 className="text-[15px] font-semibold text-ink">Request implementation</h2>
            <p className="mt-1 text-[13px] text-muted">
              Select the actions you want help with. They are sent with their findings as one scoped request, and you get one scope and one quote back.
            </p>
            <form action={requestImplementation.bind(null, clientId)} className="mt-4 space-y-4">
              <fieldset className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-hairline p-3">
                <legend className="sr-only">Actions</legend>
                {requestable.map((a) => (
                  <label key={a.id} className="flex items-start gap-2 text-[13px]">
                    <input type="checkbox" name="actionIds" value={a.id} className="mt-0.5 accent-[var(--color-gold)]" />
                    <span>
                      {a.title} <span className="text-muted">· {a.systemObligation.system.name}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {ctx.orgType === "LAW_FIRM" && (
                <fieldset className="flex gap-5 text-[13px]">
                  <legend className="mb-1 font-semibold text-ink">Send to</legend>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="route" value="OWN_TEAM" defaultChecked className="accent-[var(--color-gold)]" /> Our own team
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="route" value="SENECAI" className="accent-[var(--color-gold)]" /> SenecAI, as partner
                  </label>
                </fieldset>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="contactName" required defaultValue={ctx.userName} placeholder="Contact name" className="rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px]" />
                <input name="contactEmail" type="email" required defaultValue={ctx.email} placeholder="Contact email" className="rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px]" />
              </div>
              <textarea name="message" rows={2} placeholder="Anything we should know (optional)" className="block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px]" />
              <Button variant="primary">Send request</Button>
            </form>
          </Panel>
        )}

        {enquiries.length > 0 && (
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-ink">Requests sent</h2>
            <ul className="space-y-2">
              {enquiries.map((e) => (
                <li key={e.id} className="rounded-lg border border-hairline bg-surface px-4 py-3 text-[13px]">
                  <span className="font-semibold text-ink">{formatDate(e.createdAt)}</span> · to {e.route === "SENECAI" ? "SenecAI" : "own team"} ·{" "}
                  {e.actions.length} action{e.actions.length > 1 ? "s" : ""} · {e.status === "NEW" ? "awaiting quote" : e.status.toLowerCase()}
                </li>
              ))}
            </ul>
          </section>
        )}

        {done.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[13px] font-semibold text-muted">Closed actions ({done.length})</summary>
            <ul className="mt-2 space-y-1 text-[13px] text-muted">
              {done.map((a) => (
                <li key={a.id}>
                  ✓ {a.title} · {a.systemObligation.system.name}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
