import { getGdprObligationPlan, setGdprObligationStatus } from "@/lib/actions/gdpr-obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { buildGdprActionPlan } from "@/lib/gdpr-obligations/plan";
import { DPIA_OBLIGATION_ID } from "@/lib/gdpr-obligations/plan-meta";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StatusSegmentedForm } from "@/components/ui/status-segmented-form";
import { StubActionButton } from "@/components/ui/stub-action-button";
import { Tag } from "@/components/ui/tag";
import Link from "next/link";

const PLAN_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IMPLEMENTED", label: "Done" },
];

function verdictFor(percent: number | null): string {
  if (percent === null) return "No applicable obligations yet.";
  if (percent >= 80) return "Substantially ready. Close out the remaining action points and keep evidence current.";
  if (percent >= 45) return "Partially ready. A meaningful share of obligations still need work before this activity is compliant.";
  return "Early stage. Prioritise the DPIA (if required) and the record's core obligations first.";
}

export default async function GdprPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const { activity, items } = await getGdprObligationPlan(id);

  const notClassified = !activity.role;
  const score = computeComplianceScore(items.map((i) => ({ status: i.assessment.status })));
  const actionPlan = buildGdprActionPlan(items, activity);
  const expertReviewCount = actionPlan.filter((a) => a.expertReviewRequired).length;
  const nextDeadline = actionPlan[0]?.deadline ?? null;
  const dpiaRequired = items.some((i) => i.obligation.id === DPIA_OBLIGATION_ID);
  const redirectTo = `/gdpr/compliance-plan/${activity.id}/plan`;

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="GDPR / Step 4"
        title="Roadmap & Reports"
        subtitle={`${activity.name} — every open gap as an action point with an owner, a deadline, and an expert-review flag.`}
        actions={
          <Button variant="ghost" href={`/gdpr/compliance-plan/${activity.id}/gap`}>
            ← Gap Assessment
          </Button>
        }
      />

      <div className="p-8">
        {notClassified && (
          <div className="rounded-xl border border-transparent bg-gold-tint p-4 text-[13px] text-gold-deep">
            This activity hasn&rsquo;t been classified yet.{" "}
            <Link href={`/gdpr/inventory/${activity.id}`} className="underline">
              Go to Processing Inventory & Classification
            </Link>
            .
          </div>
        )}

        {!notClassified && items.length === 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-4 text-[13px] text-muted shadow-sm">
            No obligations for this activity — none of its characteristics trigger a tied duty. General
            obligations still apply at the organization level — see the Overview tab.
          </div>
        )}

        {!notClassified && items.length > 0 && (
          <>
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm md:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.6fr)]">
              <div className="border-b border-hairline p-5 md:border-b-0 md:border-r">
                <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  GDPR readiness
                </p>
                <p className="mt-1 text-[62px] font-semibold leading-none tracking-tightest text-ink">
                  {score.percent === null ? "—" : `${score.percent}%`}
                </p>
                <div className="mt-4">
                  <ProgressBar percent={score.percent} height="lg" />
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-body">{verdictFor(score.percent)}</p>
                <StubActionButton
                  variant="ink"
                  className="mt-4 w-full justify-start"
                  label="Download readiness report"
                  notice="The GDPR readiness report is being generated and will download shortly."
                />
              </div>

              <div className="p-5">
                <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  Roadmap summary
                </p>
                <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-4">
                  {[
                    ["Action points", actionPlan.length],
                    ["Expert review", expertReviewCount],
                    ["Implemented", score.implemented],
                    ["Next deadline", nextDeadline ? nextDeadline.toLocaleDateString() : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface p-3">
                      <p className="font-narrow text-[9.5px] font-semibold uppercase tracking-micro text-label">
                        {label}
                      </p>
                      <p className="mt-1 text-[20px] font-semibold tabular-nums text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StubActionButton
                    label="Export ROPA entry"
                    notice="This activity's Art. 30 ROPA entry has been exported."
                  />
                  {dpiaRequired && (
                    <Button variant="ghost" size="sm" href={`/gdpr/compliance-plan/${activity.id}/dpia`}>
                      Open DPIA →
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                  Each open gap becomes an action point with a deadline, an owner, and an expert-review flag. The
                  score recalculates as action points complete.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead className="bg-ink">
                  <tr>
                    {["Action point", "Basis", "Owner", "Deadline", "Expert review", "Status"].map((h) => (
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
                  {actionPlan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3.5 py-6 text-center text-[13px] text-muted">
                        No open action points — every applicable obligation is implemented or not applicable.
                      </td>
                    </tr>
                  ) : (
                    actionPlan.map((action) => (
                      <tr key={action.assessmentId}>
                        <td className="px-3.5 py-3 align-top">
                          <p className="text-[13.5px] font-semibold capitalize text-ink">{action.task}</p>
                          <p className="mt-0.5 max-w-[60ch] text-[11.5px] text-muted">{action.description}</p>
                        </td>
                        <td className="px-3.5 py-3 align-top font-narrow text-[11px] tracking-citation text-gold-hover">
                          {action.citation}
                        </td>
                        <td className="px-3.5 py-3 align-top text-[13px] text-body">{action.owner}</td>
                        <td className="px-3.5 py-3 align-top text-[13px] tabular-nums text-body">
                          {action.deadline.toLocaleDateString()}
                        </td>
                        <td className="px-3.5 py-3 align-top">
                          <Tag tone={action.expertReviewRequired ? "gold-fill" : "muted"}>
                            {action.expertReviewRequired ? "Required" : "Not required"}
                          </Tag>
                        </td>
                        <td className="px-3.5 py-3 align-top">
                          <StatusSegmentedForm
                            action={setGdprObligationStatus}
                            hiddenFields={{ id: action.assessmentId, processingActivityId: activity.id, redirectTo }}
                            activeValue={action.status}
                            options={PLAN_STATUS_OPTIONS}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
