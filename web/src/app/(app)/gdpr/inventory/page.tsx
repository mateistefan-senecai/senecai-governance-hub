import { listProcessingActivities } from "@/lib/actions/processing-activities";
import { computeProcessingActivityReadiness } from "@/lib/gdpr-obligations/readiness";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { Tag } from "@/components/ui/tag";
import Link from "next/link";

const CHARACTERISTIC_LABEL: Record<string, string> = {
  SPECIAL_CATEGORY_DATA: "Special category",
  LARGE_SCALE: "Large-scale",
  SYSTEMATIC_MONITORING: "Systematic monitoring",
  AUTOMATED_DECISION_MAKING: "Automated decisions",
  CHILDRENS_DATA: "Children's data",
  CROSS_BORDER_TRANSFER: "Cross-border transfer",
  USES_PROCESSOR: "Uses a processor",
};

export default async function GdprInventoryPage() {
  const activities = await listProcessingActivities();

  const stats = {
    activities: activities.length,
    dpiaTriggering: activities.filter((a) => {
      const tags = new Set(a.characteristics);
      return (
        (tags.has("SPECIAL_CATEGORY_DATA") && tags.has("LARGE_SCALE")) ||
        tags.has("AUTOMATED_DECISION_MAKING") ||
        tags.has("SYSTEMATIC_MONITORING")
      );
    }).length,
    unclassified: activities.filter((a) => !a.role).length,
    classified: activities.filter((a) => a.role).length,
  };

  return (
    <>
      <PageHeader
        crumb="GDPR / Step 1"
        title="Processing Inventory & Classification"
        subtitle="One row per processing activity — the Art. 30 ROPA unit. Tag each activity's role and characteristics to derive which obligations apply."
        actions={
          <Button variant="primary" href="/gdpr/inventory/new">
            + New processing activity
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-8 py-4">
        <p className="text-[12px] text-muted">
          This is also the raw data source for the ROPA export on the Compliance Roadmap step.
        </p>
        <div className="flex items-center gap-8">
          <StatTile label="Activities" value={stats.activities} />
          <StatTile label="Likely need a DPIA" value={stats.dpiaTriggering} />
          <StatTile label="Classified" value={`${stats.classified}/${stats.activities}`} />
        </div>
      </div>

      <div className="p-8">
        {activities.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No processing activities yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="bg-ink">
                <tr>
                  {["Processing activity", "Business function", "Role", "Characteristics", "Stage", "Readiness", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3.5 py-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-panel"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {activities.map((a) => {
                  const readiness = computeProcessingActivityReadiness(a).percent;
                  return (
                    <tr key={a.id} className="hover:bg-row-hover">
                      <td className="px-3.5 py-3">
                        <Link
                          href={`/gdpr/inventory/${a.id}`}
                          className="text-[13px] font-medium text-gold-hover underline decoration-gold underline-offset-[3px] hover:text-ink"
                        >
                          {a.name}
                        </Link>
                        {a.description && <p className="mt-0.5 text-[11.5px] text-muted">{a.description}</p>}
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-body">{a.businessFunction ?? "—"}</td>
                      <td className="px-3.5 py-3">
                        {a.role ? <Tag tone="outline">{a.role.replace(/_/g, " ")}</Tag> : <Tag tone="muted">Not classified</Tag>}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {a.characteristics.length === 0 ? (
                            <span className="text-[12px] text-label">—</span>
                          ) : (
                            a.characteristics.map((c) => (
                              <Tag key={c} tone="prelim">
                                {CHARACTERISTIC_LABEL[c] ?? c}
                              </Tag>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-body">{a.implementationStage ?? "—"}</td>
                      <td className="px-3.5 py-3">
                        <ProgressBar percent={readiness} showLabel />
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <Button variant="ghost" size="sm" href={`/gdpr/inventory/${a.id}`}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[11.5px] text-muted">
          Role and characteristics are self-reported directly — there&rsquo;s no decision tree here, unlike the AI
          Act module&rsquo;s role/risk classification.
        </p>
      </div>
    </>
  );
}
