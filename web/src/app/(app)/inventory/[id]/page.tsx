import { auth } from "@/lib/auth";
import { getAiSystem } from "@/lib/actions/ai-systems";
import { isConsultantOrAbove } from "@/lib/authz";
import { ClassificationPanel } from "@/components/classification-panel";
import Link from "next/link";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export default async function AiSystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const system = await getAiSystem(id);
  const canReview = session ? isConsultantOrAbove(session) : false;

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{system.organization.name}</p>
          <h1 className="text-xl font-semibold text-slate-900">{system.name}</h1>
        </div>
        <Link
          href={`/compliance-plan/${system.id}`}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Compliance plan →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClassificationPanel
          aiSystemId={system.id}
          treeId="role-classification"
          field="legalRole"
          label="Module 1.2 — Legal role"
          currentValue={system.legalRole}
          reviewed={system.legalRoleReviewedByConsultant}
          canReview={canReview}
        />
        <ClassificationPanel
          aiSystemId={system.id}
          treeId="high-risk-classification"
          field="riskClassification"
          label="Module 1.3 — Risk classification"
          currentValue={system.riskClassification}
          reviewed={system.riskClassificationReviewedByConsultant}
          canReview={canReview}
        />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Feature 1.1 — Inventory</h2>
        <dl className="mt-2 divide-y divide-slate-100">
          <Row label="Description" value={system.description} />
          <Row label="Use-case type" value={system.useCaseType} />
          <Row label="Business process affected" value={system.businessProcess} />
          <Row label="Input data" value={system.inputData} />
          <Row label="Output / decision type" value={system.outputData} />
          <Row label="Data source" value={system.dataSource} />
          <Row label="Human oversight mechanism" value={system.humanOversightMechanism} />
          <Row label="Autonomy level" value={system.autonomyLevel} />
          <Row label="Compliance owner" value={[system.complianceOwnerName, system.complianceOwnerRole].filter(Boolean).join(" — ") || null} />
          <Row label="Decisions influenced & impact" value={system.decisionsAndImpact} />
          <Row label="Employee user count" value={system.userCount} />
          <Row
            label="Affects end customers"
            value={
              system.affectsEndCustomers === null
                ? null
                : system.affectsEndCustomers
                  ? `Yes${system.endCustomerEstimate ? ` — ${system.endCustomerEstimate}` : ""}`
                  : "No"
            }
          />
          <Row label="Implementation stage" value={system.implementationStage} />
        </dl>
      </div>

      {system.decisionRuns.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Classification run history</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {system.decisionRuns.map((run) => (
              <li key={run.id} className="text-slate-600">
                {new Date(run.runAt).toLocaleString()} — {run.treeId} v{run.treeVersion} →{" "}
                <span className="font-medium">{run.resultValue.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
