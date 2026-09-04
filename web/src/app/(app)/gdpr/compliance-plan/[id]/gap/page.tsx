import { getGdprObligationPlan, setGdprObligationStatus } from "@/lib/actions/gdpr-obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { DPIA_OBLIGATION_ID } from "@/lib/gdpr-obligations/plan-meta";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StatusSegmentedForm } from "@/components/ui/status-segmented-form";
import Link from "next/link";

const GAP_STATUS_OPTIONS = [
  { value: "IMPLEMENTED", label: "Yes" },
  { value: "IN_PROGRESS", label: "Partially" },
  { value: "NOT_STARTED", label: "No" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];

export default async function GdprGapAssessmentPage({
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
  const answered = items.filter((i) => i.assessment.status !== "NOT_STARTED").length;
  const redirectTo = `/gdpr/compliance-plan/${activity.id}/gap`;

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="GDPR / Step 3"
        title="Gap assessment"
        subtitle={`${activity.name} — answer each obligation's gap question; the score updates live.`}
        actions={
          <Button variant="ghost" href={`/gdpr/inventory/${activity.id}`}>
            ← Processing Inventory
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div>
              <PanelHeading
                title="Processing-activity obligations"
                kicker="Feature 2.1"
                action={
                  <span className="text-[12px] text-muted">
                    {answered}/{items.length} answered
                  </span>
                }
              />
              <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
                {items.map(({ obligation, assessment }) => (
                  <div key={obligation.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 max-w-[60ch]">
                      {obligation.id === DPIA_OBLIGATION_ID ? (
                        <Link
                          href={`/gdpr/compliance-plan/${activity.id}/dpia`}
                          className="text-[12px] font-semibold text-ink hover:underline"
                        >
                          {obligation.title}
                        </Link>
                      ) : (
                        <span className="text-[12px] font-semibold text-ink">{obligation.title}</span>
                      )}
                      <p className="mt-0.5 text-[13px] text-body">
                        {obligation.gapQuestion ?? obligation.description}
                      </p>
                    </div>
                    <StatusSegmentedForm
                      action={setGdprObligationStatus}
                      hiddenFields={{ id: assessment.id, processingActivityId: activity.id, redirectTo }}
                      activeValue={assessment.status}
                      options={GAP_STATUS_OPTIONS}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-hairline bg-surface p-4 shadow-sm lg:sticky lg:top-5">
              <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                Live compliance score
              </p>
              <p className="mt-1 text-[44px] font-semibold leading-none tracking-tighter text-ink">
                {score.percent === null ? "—" : `${score.percent}%`}
              </p>
              <div className="mt-3">
                <ProgressBar percent={score.percent} height="md" />
              </div>
              <div className="mt-4 divide-y divide-hairline-light">
                {[
                  ["Applicable obligations", score.applicable],
                  ["Implemented", score.implemented],
                  ["Partially", score.partially],
                  ["Open gaps", score.openGaps],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 text-[12.5px]">
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold tabular-nums text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                href={`/gdpr/compliance-plan/${activity.id}/plan`}
                className="mt-4 w-full justify-start"
              >
                Build compliance plan →
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
