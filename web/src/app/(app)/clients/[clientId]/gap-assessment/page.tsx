import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { getContentVersion } from "@/lib/content/current";
import { readiness } from "@/lib/services/assessment";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { ProgressBar } from "@/components/ui/progress-bar";
import { OBLIGATION_STATUS_LABEL, OBLIGATION_STATUS_TONE, ROLE_LABEL, formatDate } from "@/lib/labels";
import type { ContentBundle } from "@/lib/content/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "NOT_ASSESSED", label: "Not assessed" },
  { id: "GAP", label: "Gap" },
  { id: "PARTIAL", label: "Partial" },
  { id: "COMPLIANT", label: "Compliant" },
  { id: "reassess", label: "To re-assess" },
] as const;

/**
 * Step 5 for the whole client: every obligation that applies to its AI
 * systems, with its status. Each one is assessed on its own page (from the
 * system, spec §3), where the reviewer records the status and rationale.
 */
export default async function GapAssessmentPage({ params, searchParams }: PageProps<"/clients/[clientId]/gap-assessment">) {
  const { clientId } = await params;
  const filter = String((await searchParams).status ?? "all");
  const ctx = await getCtx();
  const { systems, bundles } = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    const systems = await tx.aiSystem.findMany({
      where: { clientId: client.id },
      orderBy: { name: "asc" },
      include: {
        systemObligations: { where: { active: true }, orderBy: [{ appliesFrom: "asc" }, { obligationKey: "asc" }] },
        classifications: { where: { isCurrent: true }, select: { status: true } },
      },
    });
    const versions = [...new Set(systems.flatMap((s) => s.systemObligations.map((o) => o.contentVersion)))];
    const bundles = new Map<string, ContentBundle>();
    for (const v of versions) bundles.set(v, await getContentVersion(tx, v));
    return { systems, bundles };
  });

  const all = systems.flatMap((s) => s.systemObligations);
  const count = (status: string) => all.filter((o) => o.status === status).length;
  const matches = (o: (typeof all)[number]) =>
    filter === "all" ? true : filter === "reassess" ? o.needsReassessment : o.status === filter;
  const def = (o: (typeof all)[number]) => bundles.get(o.contentVersion)?.obligations.find((d) => d.key === o.obligationKey);
  const base = `/clients/${clientId}`;

  return (
    <>
      <PageHeader
        crumb="Step 5 · Gap assessment"
        title="Gap assessment"
        subtitle="Every obligation that applies to the client's AI systems, with its status. Open one to assess it: compliant, partial or gap, with the reviewer's rationale. Gaps and partials become actions on the roadmap."
        actions={<Button href={`${base}/documents#GAP_ASSESSMENT`}>Gap assessment PDF</Button>}
      />
      <div className="flex flex-wrap items-end justify-end gap-10 border-b border-hairline bg-ground px-8 py-4">
        <StatTile label="Obligations" value={all.length} />
        <StatTile label="Not assessed" value={count("NOT_ASSESSED")} />
        <StatTile label="Gap" value={count("GAP")} />
        <StatTile label="Partial" value={count("PARTIAL")} />
        <StatTile label="Compliant" value={count("COMPLIANT")} />
        <div className="w-40">
          <p className="text-right font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Readiness</p>
          <div className="mt-1.5">
            <ProgressBar percent={readiness(all)} showLabel />
          </div>
        </div>
      </div>

      <div className="space-y-8 p-8">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={f.id === "all" ? `${base}/gap-assessment` : `${base}/gap-assessment?status=${f.id}`}
              aria-current={filter === f.id ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
                filter === f.id ? "border-ink bg-ink text-rail-text" : "border-hairline bg-surface text-body hover:border-gold"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {all.length === 0 && (
          <Panel>
            <p className="text-[13.5px] text-muted">
              No obligations yet. They appear once an AI system has been classified in the{" "}
              <Link href={`${base}/inventory`} className="font-semibold text-gold-hover hover:underline">
                AI inventory
              </Link>
              .
            </p>
          </Panel>
        )}

        {systems.map((s) => {
          const items = s.systemObligations.filter(matches);
          if (!items.length) return null;
          const href = `${base}/systems/${s.id}`;
          return (
            <section key={s.id}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">
                    <Link href={href} className="hover:underline">
                      {s.name}
                    </Link>
                  </h2>
                  <p className="text-[12.5px] text-muted">
                    {s.systemObligations.length} obligations
                    {s.classifications[0]?.status === "PRELIMINARY" && " · classification awaiting review"}
                    {s.classificationStale && " · classification outdated"}
                  </p>
                </div>
                <div className="w-40">
                  <ProgressBar percent={readiness(s.systemObligations)} showLabel />
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
                <ul className="divide-y divide-hairline-light">
                  {items.map((o) => {
                    const d = def(o);
                    return (
                      <li key={o.id}>
                        <Link
                          href={`${href}/obligations/${o.id}`}
                          className="grid gap-x-5 gap-y-1 px-5 py-3.5 hover:bg-row-hover md:grid-cols-[110px_minmax(0,1fr)_130px_120px_110px]"
                        >
                          <span className="font-mono text-[12px] text-label">{d?.article ?? o.obligationKey}</span>
                          <span className="min-w-0">
                            <span className="block text-[13.5px] font-medium text-ink">{d?.title ?? o.obligationKey}</span>
                            {o.statusRationale && <span className="block truncate text-[12px] text-muted">{o.statusRationale}</span>}
                            {o.needsReassessment && <span className="block text-[12px] text-gold-deep">Changed since assessed: re-assess</span>}
                          </span>
                          <span className="text-[12.5px] text-body">
                            {o.party.split(" & ").map((p) => ROLE_LABEL[p] ?? p).join(" & ")}
                          </span>
                          <span className="text-[12.5px] text-body">{o.appliesFrom ? `From ${formatDate(o.appliesFrom)}` : "—"}</span>
                          <span className="md:text-right">
                            <Tag tone={OBLIGATION_STATUS_TONE[o.status]}>{OBLIGATION_STATUS_LABEL[o.status]}</Tag>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
