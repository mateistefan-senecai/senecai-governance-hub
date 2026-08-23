import { getObligationPlan, setObligationStatus } from "@/lib/actions/obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/obligations/category-label";
import type { ObligationCategory } from "@/lib/obligations/types";
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

export default async function GapAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const { system, items } = await getObligationPlan(id);

  const notClassified = !system.legalRole || !system.riskClassification;
  const prohibited = system.riskClassification === "PROHIBITED";
  const outOfScope = system.riskClassification === "OUT_OF_SCOPE";

  const score = computeComplianceScore(items.map((i) => ({ status: i.assessment.status })));
  const openGaps = score.applicable - score.implemented - score.partially;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.obligation.category] ??= []).push(item);
    return acc;
  }, {});

  const redirectTo = `/compliance-plan/${system.id}/gap`;

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="Module 2 / Feature 2.2"
        title="Gap assessment"
        subtitle={`${system.name} — answer each obligation's gap question; the score updates live.`}
        actions={
          <Button variant="ghost" href={`/inventory/${system.id}`}>
            ← Inventory
          </Button>
        }
      />

      <div className="p-8">
        {notClassified && (
          <div className="border-2 border-ink bg-gold-tint p-4 text-[13px] text-gold-deep">
            This system hasn&rsquo;t completed Module 1 classification yet.{" "}
            <Link href={`/inventory/${system.id}`} className="underline">
              Go to Module 1
            </Link>
            .
          </div>
        )}
        {!notClassified && prohibited && (
          <div className="border-2 border-ink bg-ink p-4 text-[13px] text-panel">
            Classified as <strong>prohibited</strong> — no compliance plan applies.
          </div>
        )}
        {!notClassified && outOfScope && (
          <div className="border-2 border-ink bg-surface p-4 text-[13px] text-muted">
            Out of scope of the AI Act — no obligations apply to this system.
          </div>
        )}

        {!notClassified && !prohibited && !outOfScope && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div>
              {CATEGORY_ORDER.map((category: ObligationCategory) => {
                const groupItems = grouped[category];
                if (!groupItems || groupItems.length === 0) return null;
                const { heading, feature } = CATEGORY_LABEL[category];
                const answered = groupItems.filter((i) => i.assessment.status !== "NOT_STARTED").length;
                return (
                  <div key={category} className="mt-6 first:mt-0">
                    <PanelHeading
                      title={heading}
                      kicker={feature}
                      action={
                        <span className="text-[12px] text-muted">
                          {answered}/{groupItems.length} answered
                        </span>
                      }
                    />
                    <div className="divide-y divide-hairline border border-t-0 border-ink bg-surface">
                      {groupItems.map(({ obligation, assessment }) => (
                        <div key={obligation.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                          <p className="min-w-0 max-w-[60ch] text-[13px] text-body">
                            {obligation.gapQuestion ?? obligation.description}
                          </p>
                          <StatusSegmentedForm
                            action={setObligationStatus}
                            hiddenFields={{ id: assessment.id, aiSystemId: system.id, redirectTo }}
                            activeValue={assessment.status}
                            options={GAP_STATUS_OPTIONS}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-2 border-ink bg-surface p-4 lg:sticky lg:top-5">
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
                  ["Open gaps", openGaps],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 text-[12.5px]">
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold tabular-nums text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <Button variant="primary" href={`/compliance-plan/${system.id}/plan`} className="mt-4 w-full justify-start">
                Build compliance plan →
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
