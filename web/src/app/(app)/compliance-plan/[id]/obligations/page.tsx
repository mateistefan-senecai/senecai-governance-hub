import { getObligationPlan } from "@/lib/actions/obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/obligations/category-label";
import { DOSSIER_OBLIGATION_IDS } from "@/lib/obligations/plan-meta";
import type { ObligationCategory } from "@/lib/obligations/types";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { ClassificationTag } from "@/components/ui/classification-tag";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StubActionButton } from "@/components/ui/stub-action-button";
import Link from "next/link";

export default async function ObligationsPage({
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

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="Module 2 / Feature 2.1"
        title="Obligations"
        subtitle={`${system.name} — every duty this classification maps, grouped by category.`}
        actions={
          <Button variant="ghost" href={`/inventory/${system.id}`}>
            ← Inventory
          </Button>
        }
      />

      <div className="p-8">
        {notClassified && (
          <div className="border-2 border-ink bg-gold-tint p-4 text-[13px] text-gold-deep">
            This system hasn&rsquo;t completed Module 1 classification yet — obligations can&rsquo;t be mapped
            without a legal role and risk classification.{" "}
            <Link href={`/inventory/${system.id}`} className="underline">
              Go to Module 1
            </Link>
            .
          </div>
        )}

        {!notClassified && prohibited && (
          <div className="border-2 border-ink bg-ink p-4 text-[13px] text-panel">
            Classified as <strong>prohibited</strong> under Art. 5 — this system must not be placed on the market or
            put into service. No compliance plan applies; escalate to a consultant immediately.
          </div>
        )}

        {!notClassified && outOfScope && (
          <div className="border-2 border-ink bg-surface p-4 text-[13px] text-muted">
            Out of scope of the AI Act — no obligations apply to this system.
          </div>
        )}

        {!notClassified && !prohibited && !outOfScope && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-semibold text-ink">{system.name}</span>
                <ClassificationTag value={system.legalRole} reviewed={system.legalRoleReviewedByConsultant} />
                <ClassificationTag
                  value={system.riskClassification}
                  reviewed={system.riskClassificationReviewedByConsultant}
                />
              </div>
              <p className="text-[12.5px] text-muted">
                {items.length} obligation{items.length === 1 ? "" : "s"} mapped · {openGaps} open gap
                {openGaps === 1 ? "" : "s"}
              </p>
            </div>

            {CATEGORY_ORDER.map((category: ObligationCategory) => {
              const groupItems = grouped[category];
              if (!groupItems || groupItems.length === 0) return null;
              const { heading, feature } = CATEGORY_LABEL[category];
              return (
                <div key={category} className="mt-6">
                  <PanelHeading title={heading} kicker={feature} action={<span className="text-[12px] text-muted">{groupItems.length}</span>} />
                  <div className="divide-y divide-hairline border border-t-0 border-ink bg-surface">
                    {groupItems.map(({ obligation, assessment }) => (
                      <div key={obligation.id} className="grid grid-cols-[minmax(0,1fr)_150px] gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">
                            {obligation.title}{" "}
                            <span className="font-narrow text-[10.5px] font-normal tracking-citation text-gold-hover">
                              {obligation.citation}
                            </span>
                          </p>
                          <p className="mt-1 max-w-[88ch] text-[12.5px] leading-relaxed text-muted">
                            {obligation.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Tag tone={assessment.status === "IMPLEMENTED" ? "ink-fill" : "muted"}>
                            {assessment.status.replace(/_/g, " ")}
                          </Tag>
                          {DOSSIER_OBLIGATION_IDS.has(obligation.id) && (
                            <StubActionButton
                              label="Generate dossier"
                              notice={`A pre-filled ${obligation.title} template has been generated.`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-6">
              <Button variant="primary" href={`/compliance-plan/${system.id}/gap`}>
                Start gap assessment →
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
