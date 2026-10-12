import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canAdmin, clientWhere } from "@/lib/authz";
import { aiActApplies } from "@/lib/services/inventory";
import { readiness } from "@/lib/services/assessment";
import { createClient } from "@/lib/actions/clients";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { ORG_TYPE_LABEL } from "@/lib/labels";

export default async function ClientsPage() {
  const ctx = await getCtx();
  const clients = await withTenant(ctx, (tx) =>
    tx.client.findMany({
      where: clientWhere(ctx),
      orderBy: { name: "asc" },
      include: {
        aiSystems: {
          include: {
            classifications: { where: { isCurrent: true }, select: { effective: true, status: true } },
            systemObligations: { where: { active: true }, select: { status: true, active: true } },
          },
        },
      },
    }),
  );

  return (
    <>
      <PageHeader
        crumb={`${ctx.orgName} · ${ORG_TYPE_LABEL[ctx.orgType]}`}
        title="Clients"
        subtitle={
          ctx.role === "REVIEWER"
            ? "The clients you are assigned to. Open one to work in its AI inventory."
            : "Every client of your organisation. Open one to work in its AI inventory."
        }
      />
      <div className="space-y-6 p-8">
        {clients.length === 0 ? (
          <Panel>
            <p className="text-[13.5px] text-muted">
              {ctx.role === "REVIEWER" ? "You are not assigned to any client yet." : "No clients yet."}
            </p>
          </Panel>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-ink text-panel">
                <tr className="font-narrow text-[10.5px] uppercase tracking-micro">
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">AI Act</th>
                  <th className="px-4 py-3 font-semibold">AI systems</th>
                  <th className="px-4 py-3 font-semibold">Classified</th>
                  <th className="px-4 py-3 font-semibold">High-risk</th>
                  <th className="px-4 py-3 font-semibold">Open obligations</th>
                  <th className="w-44 px-4 py-3 font-semibold">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-light">
                {clients.map((c) => {
                  const classified = c.aiSystems.filter((s) => s.classifications.length).length;
                  const highRisk = c.aiSystems.filter(
                    (s) => (s.classifications[0]?.effective as { riskClass?: string } | undefined)?.riskClass === "HIGH_RISK",
                  ).length;
                  const obligations = c.aiSystems.flatMap((s) => s.systemObligations);
                  const open = obligations.filter((o) => o.status !== "COMPLIANT").length;
                  return (
                    <tr key={c.id} className="hover:bg-row-hover">
                      <td className="px-5 py-3.5">
                        <Link href={`/clients/${c.id}`} className="font-semibold text-ink underline-offset-2 hover:text-gold-hover hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        {!c.applicability ? (
                          <Tag tone="muted">Check not run</Tag>
                        ) : aiActApplies(c) ? (
                          <Tag tone="outline">Applies</Tag>
                        ) : (
                          <Tag tone="muted">Does not apply</Tag>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{c.aiSystems.length}</td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {classified}/{c.aiSystems.length}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{highRisk}</td>
                      <td className="px-4 py-3.5 tabular-nums">{open}</td>
                      <td className="px-4 py-3.5">
                        <ProgressBar percent={readiness(obligations)} showLabel />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canAdmin(ctx) && (
          <Panel className="max-w-xl">
            <h2 className="text-[15px] font-semibold text-ink">Add a client</h2>
            <p className="mt-1 text-[13px] text-muted">The company you will work for. Its data is visible only inside {ctx.orgName}.</p>
            <form action={createClient} className="mt-4 flex gap-2">
              <input
                name="name"
                required
                placeholder="Company name, e.g. Acme Romania SRL"
                className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px]"
              />
              <Button variant="primary">Add client</Button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
