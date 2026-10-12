import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canReview, requireClient } from "@/lib/authz";
import { aiActApplies } from "@/lib/services/inventory";
import { readiness } from "@/lib/services/assessment";
import { effectiveOf, nextStep } from "@/lib/views/system-status";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { StatTile } from "@/components/ui/stat-tile";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CLASSIFICATION_STATUS_LABEL, ORIGIN_LABEL, RISK_LABEL, RISK_TONE, roleList } from "@/lib/labels";

export default async function InventoryPage({ params }: PageProps<"/clients/[clientId]/inventory">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const { client, systems } = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    const systems = await tx.aiSystem.findMany({
      where: { clientId: client.id },
      orderBy: { name: "asc" },
      include: {
        classifications: { where: { isCurrent: true }, select: { status: true, effective: true } },
        systemObligations: { select: { status: true, active: true, needsReassessment: true } },
      },
    });
    return { client, systems };
  });
  if (!aiActApplies(client)) redirect(`/clients/${client.id}/applicability`);

  const base = `/clients/${client.id}`;
  const reviewer = canReview(ctx);
  const effective = systems.map(effectiveOf);
  const highRisk = effective.filter((e) => e?.riskClass === "HIGH_RISK").length;
  const awaitingReview = systems.filter((s) => s.classifications[0]?.status === "PRELIMINARY").length;
  const allObligations = systems.flatMap((s) => s.systemObligations);
  const open = allObligations.filter((o) => o.active && o.status !== "COMPLIANT").length;
  const overall = readiness(allObligations);

  return (
    <>
      <PageHeader
        crumb="Step 1 · AI inventory"
        title="AI inventory"
        subtitle="Every AI system the company builds, buys or embeds. Open a system to classify it and work through its obligations."
        actions={<Button variant="primary" href={`${base}/systems/new`}>+ Add AI system</Button>}
      />
      <div className="flex flex-wrap items-end justify-end gap-10 border-b border-hairline bg-ground px-8 py-4">
        <StatTile label="AI systems" value={systems.length} />
        <StatTile label="High-risk" value={highRisk} />
        <StatTile label="Awaiting review" value={awaitingReview} />
        <StatTile label="Open obligations" value={open} />
        <div className="w-40">
          <p className="text-right font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Readiness</p>
          <div className="mt-1.5">
            <ProgressBar percent={overall} showLabel />
          </div>
        </div>
      </div>

      <div className="p-8">
        {systems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-neutral bg-panel p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No AI systems yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
              Add each AI system the company builds, buys or embeds, including third-party tools staff use at work.
            </p>
            <div className="mt-4">
              <Button variant="primary" href={`${base}/systems/new`}>Add the first system</Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-ink text-panel">
                <tr className="font-narrow text-[10.5px] uppercase tracking-micro">
                  <th className="px-5 py-3 font-semibold">AI system</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Origin</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Risk class</th>
                  <th className="px-4 py-3 font-semibold">Open obligations</th>
                  <th className="px-4 py-3 font-semibold" title="Share of required evidence provided — arrives with the evidence workflow (Stage 2)">
                    Evidence
                  </th>
                  <th className="px-4 py-3 font-semibold">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-light">
                {systems.map((s, i) => {
                  const e = effective[i];
                  const current = s.classifications[0];
                  const step = nextStep(s, base, reviewer);
                  const active = s.systemObligations.filter((o) => o.active);
                  const openCount = active.filter((o) => o.status !== "COMPLIANT").length;
                  return (
                    <tr key={s.id} className="align-top hover:bg-row-hover">
                      <td className="max-w-[300px] px-5 py-3.5">
                        <Link href={`${base}/systems/${s.id}`} className="font-semibold text-ink underline-offset-2 hover:text-gold-hover hover:underline">
                          {s.name}
                        </Link>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{s.purpose}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px]">{s.ownerName}</td>
                      <td className="px-4 py-3.5 text-[12.5px]">
                        {ORIGIN_LABEL[s.origin]}
                        {s.supplier && <span className="block text-[11.5px] text-muted">{s.supplier}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px]">{e ? roleList(e.roles as string[]) : <span className="text-disabled">—</span>}</td>
                      <td className="px-4 py-3.5">
                        {e ? (
                          <div className="space-y-1">
                            <Tag tone={RISK_TONE[e.riskClass as string]}>{RISK_LABEL[e.riskClass as string]}</Tag>
                            <p className={`text-[11px] ${s.classificationStale ? "font-semibold text-gold-deep" : "text-muted"}`}>
                              {s.classificationStale ? "Outdated" : CLASSIFICATION_STATUS_LABEL[current!.status]}
                            </p>
                          </div>
                        ) : (
                          <Tag tone="muted">Not classified</Tag>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {e ? (
                          <>
                            {openCount}
                            <span className="text-muted"> / {active.length}</span>
                          </>
                        ) : (
                          <span className="text-disabled">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-disabled">Stage 2</td>
                      <td className="px-4 py-3.5">
                        {step ? (
                          <Link
                            href={step.href}
                            className={`whitespace-nowrap text-[12.5px] font-semibold underline-offset-2 hover:underline ${step.urgent ? "text-gold-hover" : "text-muted"}`}
                          >
                            {step.label} →
                          </Link>
                        ) : (
                          <span className="text-[12px] text-muted">Up to date</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
