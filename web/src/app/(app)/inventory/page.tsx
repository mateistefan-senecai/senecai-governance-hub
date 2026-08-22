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

export default async function InventoryPage() {
  const systems = await listAiSystems();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Module 1 — AI Inventory & Risk Classification</h1>
          <p className="mt-1 text-sm text-slate-500">
            One row per AI system. Role and risk classification are preliminary until a
            consultant reviews them.
          </p>
        </div>
        <Link
          href="/inventory/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          New AI system
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">System</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {systems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No AI systems yet.
                </td>
              </tr>
            )}
            {systems.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/inventory/${s.id}`} className="font-medium text-slate-900 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.organization.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.implementationStage ?? "—"}</td>
                <td className="px-4 py-3">
                  {s.legalRole ? (
                    <Badge tone={s.legalRoleReviewedByConsultant ? "ok" : "warn"}>
                      {s.legalRole.replace(/_/g, " ")}
                      {!s.legalRoleReviewedByConsultant && " (prelim.)"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">not classified</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.riskClassification ? (
                    <Badge tone={s.riskClassificationReviewedByConsultant ? "ok" : "warn"}>
                      {s.riskClassification.replace(/_/g, " ")}
                      {!s.riskClassificationReviewedByConsultant && " (prelim.)"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">not classified</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
