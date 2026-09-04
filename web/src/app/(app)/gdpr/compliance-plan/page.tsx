import { listProcessingActivities } from "@/lib/actions/processing-activities";
import { computeProcessingActivityReadiness } from "@/lib/gdpr-obligations/readiness";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";

export default async function GdprCompliancePlanPage() {
  const activities = await listProcessingActivities();

  return (
    <>
      <PageHeader
        crumb="GDPR / Steps 2–4"
        title="Obligations, Gap Assessment & Compliance Roadmap"
        subtitle="Obligation mapping, gap assessment and the GDPR readiness roadmap for each processing activity, based on its role and characteristics from Processing Inventory & Classification."
      />

      <div className="p-8">
        {activities.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No processing activities yet — add one in Processing Inventory & Classification.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-ink">
                <tr>
                  {["Processing activity", "Organization", "Role", "Readiness", ""].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-panel"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-row-hover">
                    <td className="px-3.5 py-3 text-[13px] font-medium text-ink">{a.name}</td>
                    <td className="px-3.5 py-3 text-[13px] text-body">{a.organization.name}</td>
                    <td className="px-3.5 py-3">
                      {a.role ? <Tag tone="outline">{a.role.replace(/_/g, " ")}</Tag> : <Tag tone="muted">Not classified</Tag>}
                    </td>
                    <td className="px-3.5 py-3">
                      <ProgressBar percent={computeProcessingActivityReadiness(a).percent} showLabel />
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Button variant="ghost" size="sm" href={`/gdpr/compliance-plan/${a.id}/obligations`}>
                        View plan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
