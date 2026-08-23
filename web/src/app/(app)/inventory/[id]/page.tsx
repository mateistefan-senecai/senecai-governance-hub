import { auth } from "@/lib/auth";
import { getAiSystem } from "@/lib/actions/ai-systems";
import { isConsultantOrAbove } from "@/lib/authz";
import { getApplicableObligations } from "@/lib/obligations";
import { ClassificationCard } from "@/components/classification-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-surface px-5 py-[13px]">
      <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value ?? <span className="text-disabled">—</span>}</p>
    </div>
  );
}

export default async function AiSystemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const session = await auth();
  const system = await getAiSystem(id);
  const canReview = session ? isConsultantOrAbove(session) : false;
  const applicableObligations = getApplicableObligations(system);

  const complianceOwner =
    [system.complianceOwnerName, system.complianceOwnerRole].filter(Boolean).join(" — ") || null;

  const usersAndAffected =
    system.userCount === null && system.affectsEndCustomers === null
      ? null
      : [
          system.userCount !== null ? `${system.userCount} employee users` : null,
          system.affectsEndCustomers === null
            ? null
            : system.affectsEndCustomers
              ? `affects end customers${system.endCustomerEstimate ? ` (${system.endCustomerEstimate})` : ""}`
              : "does not affect end customers",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb={system.organization.name}
        title={system.name}
        actions={<Button variant="ghost" href="/inventory">← Inventory</Button>}
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] lg:items-start">
        <div className="border-2 border-ink bg-surface">
          <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
            <div>
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                Feature 1.1 — inventory record
              </p>
              <h2 className="text-base font-semibold text-ink">Record</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2">
            <Field label="Description" value={system.description} />
            <Field label="Use-case type" value={system.useCaseType} />
            <Field label="Business process affected" value={system.businessProcess} />
            <Field label="Input data" value={system.inputData} />
            <Field label="Output / decision type" value={system.outputData} />
            <Field label="Data source" value={system.dataSource} />
            <Field label="Human oversight mechanism" value={system.humanOversightMechanism} />
            <Field label="Autonomy level" value={system.autonomyLevel} />
            <Field label="Compliance owner" value={complianceOwner} />
            <Field label="Decisions influenced & impact" value={system.decisionsAndImpact} />
            <Field label="Users & affected persons" value={usersAndAffected} />
            <Field label="Implementation stage" value={system.implementationStage} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <ClassificationCard
            aiSystemId={system.id}
            aiSystemName={system.name}
            legalRole={system.legalRole}
            riskClassification={system.riskClassification}
            legalRoleReviewed={system.legalRoleReviewedByConsultant}
            riskClassificationReviewed={system.riskClassificationReviewedByConsultant}
            canReview={canReview}
          />

          <div className="border-2 border-ink bg-panel p-4">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Next step
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              {system.legalRole && system.riskClassification
                ? `This classification maps ${applicableObligations.length} obligation${applicableObligations.length === 1 ? "" : "s"}${
                    system.riskClassification === "HIGH_RISK" ? ", including the Annex IV technical documentation dossier" : ""
                  }.`
                : "Complete classification to see the obligations that apply to this system."}
            </p>
            <Button variant="ghost" href={`/compliance-plan/${system.id}/obligations`} className="mt-3 w-full justify-start">
              Module 2 — Obligations →
            </Button>
          </div>

          {system.decisionRuns.length > 0 && (
            <div className="border-2 border-ink bg-surface p-4">
              <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                Classification run history
              </p>
              <ul className="mt-2 space-y-1.5">
                {system.decisionRuns.map((run) => (
                  <li key={run.id} className="text-[12px] text-muted">
                    {new Date(run.runAt).toLocaleString()} — {run.treeId} v{run.treeVersion} →{" "}
                    <span className="font-medium text-ink">{run.resultValue.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
