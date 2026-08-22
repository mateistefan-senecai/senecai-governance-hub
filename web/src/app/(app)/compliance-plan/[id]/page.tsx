import { auth } from "@/lib/auth";
import { getObligationPlan, updateObligationAssessment, markObligationReviewed } from "@/lib/actions/obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { isConsultantOrAbove } from "@/lib/authz";
import type { ObligationCategory } from "@/lib/obligations";
import type { ObligationStatus } from "@/generated/prisma/enums";
import Link from "next/link";

const CATEGORY_LABEL: Record<ObligationCategory, string> = {
  GENERAL: "General obligations",
  PROVIDER_HIGH_RISK: "Provider — high-risk obligations (Art. 8–22)",
  DEPLOYER_HIGH_RISK: "Deployer — high-risk obligations (Art. 26–27)",
};

const STATUS_LABEL: Record<ObligationStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  IMPLEMENTED: "Implemented",
  NOT_APPLICABLE: "Not applicable",
};

function StatusBadge({ status }: { status: ObligationStatus }) {
  const toneClass =
    status === "IMPLEMENTED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "IN_PROGRESS"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded px-2 py-0.5 text-xs ${toneClass}`}>{STATUS_LABEL[status]}</span>;
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function CompliancePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canReview = session ? isConsultantOrAbove(session) : false;
  const { system, items } = await getObligationPlan(id);
  const score = computeComplianceScore(items.map((i) => ({ status: i.assessment.status })));

  const notClassified = !system.legalRole || !system.riskClassification;
  const prohibited = system.riskClassification === "PROHIBITED";
  const outOfScope = system.riskClassification === "OUT_OF_SCOPE";

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.obligation.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{system.organization.name}</p>
        <h1 className="text-xl font-semibold text-slate-900">{system.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Role: {system.legalRole?.replace(/_/g, " ") ?? "not classified"} · Risk:{" "}
          {system.riskClassification?.replace(/_/g, " ") ?? "not classified"}
        </p>
      </div>

      {notClassified && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This system hasn&apos;t completed Module 1 classification yet — obligations can&apos;t be
          mapped without a legal role and risk classification.{" "}
          <Link href={`/inventory/${system.id}`} className="underline">
            Go to Module 1
          </Link>
          .
        </div>
      )}

      {!notClassified && prohibited && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Classified as <strong>prohibited</strong> under Art. 5 — this system must not be placed
          on the market or put into service. No compliance plan applies; escalate to a consultant
          immediately.
        </div>
      )}

      {!notClassified && outOfScope && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Out of scope of the AI Act — no obligations apply to this system.
        </div>
      )}

      {!notClassified && !prohibited && !outOfScope && (
        <>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  AI Act readiness — compliance score
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {score.percent === null ? "—" : `${score.percent}%`}
                </p>
                <p className="text-xs text-slate-500">
                  {score.implemented} of {score.applicable} applicable obligations implemented
                </p>
              </div>
              <div className="h-2 w-40 shrink-0 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${score.percent ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          {(Object.keys(CATEGORY_LABEL) as ObligationCategory[]).map((category) => {
            const groupItems = grouped[category];
            if (!groupItems || groupItems.length === 0) return null;
            return (
              <div key={category} className="mt-6">
                <h2 className="text-sm font-semibold text-slate-900">{CATEGORY_LABEL[category]}</h2>
                <div className="mt-2 space-y-3">
                  {groupItems.map(({ obligation, assessment }) => (
                    <div key={obligation.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{obligation.title}</p>
                          <p className="text-xs text-slate-400">{obligation.citation}</p>
                          <p className="mt-1 text-sm text-slate-600">{obligation.description}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={assessment.status} />
                          {assessment.reviewedByConsultant ? (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                              reviewed
                            </span>
                          ) : (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                              pending review
                            </span>
                          )}
                        </div>
                      </div>

                      <form action={updateObligationAssessment} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <input type="hidden" name="id" value={assessment.id} />
                        <input type="hidden" name="aiSystemId" value={system.id} />
                        <label className="text-xs text-slate-500">
                          Status
                          <select
                            name="status"
                            defaultValue={assessment.status}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          >
                            {Object.entries(STATUS_LABEL).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-slate-500">
                          Owner
                          <input
                            name="ownerName"
                            defaultValue={assessment.ownerName ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Due date
                          <input
                            type="date"
                            name="dueDate"
                            defaultValue={toDateInputValue(assessment.dueDate)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Note
                          <input
                            name="note"
                            defaultValue={assessment.note ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <div className="col-span-2 sm:col-span-4">
                          <button
                            type="submit"
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                          >
                            Save
                          </button>
                        </div>
                      </form>

                      {canReview && !assessment.reviewedByConsultant && (
                        <form action={markObligationReviewed} className="mt-2">
                          <input type="hidden" name="id" value={assessment.id} />
                          <input type="hidden" name="aiSystemId" value={system.id} />
                          <button type="submit" className="text-sm text-emerald-700 underline">
                            Mark reviewed by consultant
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
