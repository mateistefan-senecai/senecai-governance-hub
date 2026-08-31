import { getAccessibleOrganizations, listAiSystems } from "@/lib/actions/ai-systems";
import { getRegulationScope } from "@/lib/actions/regulation-scope";
import { getExposureAssessment } from "@/lib/actions/exposure-assessment";
import { REGULATIONS } from "@/lib/regulations";
import { getOrgObligationPlan, setOrgObligationStatus } from "@/lib/actions/org-obligations";
import { computeSystemReadiness } from "@/lib/obligations/readiness";
import { computeComplianceScore } from "@/lib/obligations/score";
import type { RegulationCode } from "@/generated/prisma/enums";
import type { AssessmentResult } from "@/components/regulatory-exposure/types";
import { ExposureBadges } from "@/components/regulatory-exposure";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ClassificationTag } from "@/components/ui/classification-tag";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StatusSegmentedForm } from "@/components/ui/status-segmented-form";
import Link from "next/link";

const REGULATION_LABEL: Record<RegulationCode, string> = {
  AI_ACT: "AI Act",
  GDPR: "GDPR",
  NIS2: "NIS2",
  DORA: "DORA",
  CRA: "CRA",
};

const GENERAL_STATUS_OPTIONS = [
  { value: "IMPLEMENTED", label: "Yes" },
  { value: "IN_PROGRESS", label: "Partially" },
  { value: "NOT_STARTED", label: "No" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const organizations = await getAccessibleOrganizations();
  const systems = await listAiSystems();

  const systemsByOrg = new Map<string, typeof systems>();
  for (const s of systems) {
    const list = systemsByOrg.get(s.organizationId) ?? [];
    list.push(s);
    systemsByOrg.set(s.organizationId, list);
  }

  const orgSections = await Promise.all(
    organizations.map(async (org) => {
      const [scope, { items: generalItems }, exposureAssessment] = await Promise.all([
        getRegulationScope(org.id),
        getOrgObligationPlan(org.id),
        getExposureAssessment(org.id),
      ]);
      const orgSystems = systemsByOrg.get(org.id) ?? [];
      const systemPercents = orgSystems
        .map((s) => computeSystemReadiness(s).percent)
        .filter((p): p is number => p !== null);
      const generalScore = computeComplianceScore(generalItems.map((i) => ({ status: i.assessment.status })));
      const orgPercents = generalScore.percent !== null ? [...systemPercents, generalScore.percent] : systemPercents;

      return { org, scope, generalItems, orgSystems, exposureAssessment, aiActPercent: average(orgPercents) };
    }),
  );

  const aggregatePercent = average(
    orgSections.map((s) => s.aiActPercent).filter((p): p is number => p !== null),
  );
  const anyGdprApplicable = orgSections.some((s) => s.scope.GDPR);
  const anyNis2Applicable = orgSections.some((s) => s.scope.NIS2);
  const anyDoraApplicable = orgSections.some((s) => s.scope.DORA);
  const anyCraApplicable = orgSections.some((s) => s.scope.CRA);
  const applicableByRegulation: Record<RegulationCode, boolean> = {
    AI_ACT: true,
    GDPR: anyGdprApplicable,
    NIS2: anyNis2Applicable,
    DORA: anyDoraApplicable,
    CRA: anyCraApplicable,
  };

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        title="Overview"
        subtitle="Every regulatory obligation your organization has, aggregated across every applicable regulation."
        actions={
          <Button variant="ghost" href="/settings/regulations">
            Which regulations apply →
          </Button>
        }
      />

      <div className="p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,0.6fr)_minmax(0,1.4fr)]">
          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Aggregate compliance score
            </p>
            <p className="mt-1 text-[52px] font-semibold leading-none tracking-tightest text-ink">
              {aggregatePercent === null ? "—" : `${aggregatePercent}%`}
            </p>
            <div className="mt-4">
              <ProgressBar percent={aggregatePercent} height="lg" />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Averages every AI system&rsquo;s readiness plus each organization&rsquo;s general obligations.
              100% is the target across every applicable regulation.
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Per-regulation score
            </p>
            <div className="mt-3 divide-y divide-hairline-light">
              {REGULATIONS.map((reg) => (
                <div key={reg} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-medium text-ink">{REGULATION_LABEL[reg]}</span>
                    {reg !== "AI_ACT" && !applicableByRegulation[reg] && (
                      <span className="text-[11px] text-disabled">not applicable</span>
                    )}
                  </div>
                  {reg === "AI_ACT" ? (
                    <div className="flex w-[180px] items-center">
                      <ProgressBar percent={aggregatePercent} showLabel />
                    </div>
                  ) : (
                    <Tag tone="muted">Coming soon</Tag>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {orgSections.map(({ org, orgSystems, generalItems, exposureAssessment }) => (
          <div key={org.id} className="mt-8">
            <PanelHeading
              title={org.name}
              kicker="Organization"
              action={
                <span className="text-[12px] text-muted">
                  {orgSystems.length} AI system{orgSystems.length === 1 ? "" : "s"}
                </span>
              }
            />
            <ExposureNudge organizationId={org.id} assessment={exposureAssessment} />
            <div className="mt-3 overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
              {orgSystems.length === 0 ? (
                <p className="p-5 text-[13px] text-muted">No AI systems yet for this organization.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="bg-ink">
                      <tr>
                        {["AI system", "Legal role", "Risk class", "Readiness", ""].map((h) => (
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
                      {orgSystems.map((s) => (
                        <tr key={s.id} className="hover:bg-row-hover">
                          <td className="px-3.5 py-3 text-[13px] font-medium text-ink">{s.name}</td>
                          <td className="px-3.5 py-3">
                            <ClassificationTag value={s.legalRole} reviewed={s.legalRoleReviewedByConsultant} />
                          </td>
                          <td className="px-3.5 py-3">
                            <ClassificationTag
                              value={s.riskClassification}
                              reviewed={s.riskClassificationReviewedByConsultant}
                            />
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

              <div className="border-t border-hairline">
                <p className="px-5 pt-4 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                  General obligations
                </p>
                <p className="px-5 pb-1 text-[12px] text-muted">
                  Apply to {org.name} as a whole, regardless of any one system&rsquo;s classification.
                </p>
                <div className="divide-y divide-hairline">
                  {generalItems.map(({ obligation, assessment }) => (
                    <div
                      key={obligation.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5"
                    >
                      <div className="min-w-0 max-w-[60ch]">
                        <p className="text-[13px] font-semibold text-ink">
                          {obligation.title}{" "}
                          <span className="font-narrow text-[10.5px] font-normal tracking-citation text-gold-hover">
                            {obligation.citation}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {obligation.gapQuestion ?? obligation.description}
                        </p>
                      </div>
                      <StatusSegmentedForm
                        action={setOrgObligationStatus}
                        hiddenFields={{ id: assessment.id, redirectTo: "/overview" }}
                        activeValue={assessment.status}
                        options={GENERAL_STATUS_OPTIONS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {organizations.length === 0 && (
          <p className="mt-8 rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No organizations accessible yet.
          </p>
        )}

        <p className="mt-6 text-[11.5px] text-muted">
          <Link href="/inventory" className="underline">
            Go to Inventory & Classification
          </Link>{" "}
          to add AI systems and see them reflected here.
        </p>
      </div>
    </>
  );
}

/**
 * "First action when accessing the platform" (concept note) — a prominent
 * card inviting the org to take the Regulatory Exposure assessment if it
 * hasn't yet, or a compact completed summary + retake link once it has.
 * A nudge, not a gate: nothing else on the platform is blocked by this.
 */
function ExposureNudge({
  organizationId,
  assessment,
}: {
  organizationId: string;
  assessment: AssessmentResult | null;
}) {
  const href = `/overview/assessment/${organizationId}`;

  if (!assessment) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-transparent bg-gold-tint p-4">
        <div>
          <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-deep">
            Suggested first step
          </p>
          <p className="mt-1 text-[13.5px] font-medium text-ink">Take the regulatory exposure assessment</p>
          <p className="mt-0.5 max-w-[62ch] text-[12.5px] text-gold-deep">
            A 20-question triage read on which of AI Act, GDPR, NIS2, DORA and CRA likely apply — the fastest way
            to see the full picture before diving into Inventory & Classification.
          </p>
        </div>
        <Button variant="primary" href={href} className="shrink-0">
          Start assessment →
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hairline bg-surface p-4 shadow-sm">
      <div className="min-w-0">
        <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
          Regulatory exposure — completed {new Date(assessment.completedAt).toLocaleDateString()}
        </p>
        <div className="mt-1.5">
          <ExposureBadges results={assessment.results} />
        </div>
      </div>
      <Button variant="ghost" size="sm" href={href} className="shrink-0">
        Retake
      </Button>
    </div>
  );
}
