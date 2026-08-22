import Link from "next/link";
import { listAiSystems } from "@/lib/actions/ai-systems";

function Badge({ children, tone }: { children: React.ReactNode; tone: "neutral" | "warn" | "ok" }) {
  const toneClass =
    tone === "warn"
      ? "bg-amber-100 text-amber-800"
      : tone === "ok"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded px-2 py-0.5 text-xs ${toneClass}`}>{children}</span>;
}

export default async function CompliancePlanPage() {
  const systems = await listAiSystems();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Module 2 — Compliance Plan</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Obligation mapping (2.1), gap assessment (2.2) and the AI Act Readiness roadmap (2.3)
        for each AI system, based on its Module 1 role and risk classification.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">System</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {systems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No AI systems yet — add one in Module 1.
                </td>
              </tr>
            )}
            {systems.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.organization.name}</td>
                <td className="px-4 py-3">
                  {s.legalRole ? (
                    <Badge tone="neutral">{s.legalRole.replace(/_/g, " ")}</Badge>
                  ) : (
                    <Badge tone="neutral">not classified</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.riskClassification ? (
                    <Badge tone="neutral">{s.riskClassification.replace(/_/g, " ")}</Badge>
                  ) : (
                    <Badge tone="neutral">not classified</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/compliance-plan/${s.id}`} className="text-sm text-slate-900 underline hover:no-underline">
                    View plan
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
