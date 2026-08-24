import { listAiSystems } from "@/lib/actions/ai-systems";
import { computeSystemReadiness } from "@/lib/obligations/readiness";
import { PageHeader } from "@/components/ui/page-header";
import { ClassificationTag } from "@/components/ui/classification-tag";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";

export default async function CompliancePlanPage() {
  const systems = await listAiSystems();

  return (
    <>
      <PageHeader
        crumb="AI Act / Steps 2–4"
        title="Obligations, Gap Assessment & Compliance Roadmap"
        subtitle="Obligation mapping, gap assessment and the AI Act readiness roadmap for each AI system, based on its role and risk classification from Inventory & Classification."
      />

      <div className="p-8">
        {systems.length === 0 ? (
          <p className="border-2 border-ink bg-surface p-8 text-center text-[13px] text-muted">
            No AI systems yet — add one in Inventory & Classification.
          </p>
        ) : (
          <div className="overflow-x-auto border-2 border-ink bg-surface">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-ink">
                <tr>
                  {["AI system", "Organization", "Legal role", "Risk class", "Readiness", ""].map((h) => (
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
                {systems.map((s) => (
                  <tr key={s.id} className="hover:bg-row-hover">
                    <td className="px-3.5 py-3 text-[13px] font-medium text-ink">{s.name}</td>
                    <td className="px-3.5 py-3 text-[13px] text-body">{s.organization.name}</td>
                    <td className="px-3.5 py-3">
                      <ClassificationTag value={s.legalRole} reviewed={s.legalRoleReviewedByConsultant} />
                    </td>
                    <td className="px-3.5 py-3">
                      <ClassificationTag value={s.riskClassification} reviewed={s.riskClassificationReviewedByConsultant} />
                    </td>
                    <td className="px-3.5 py-3">
                      <ProgressBar percent={computeSystemReadiness(s).percent} showLabel />
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Button variant="ghost" size="sm" href={`/compliance-plan/${s.id}/obligations`}>
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
