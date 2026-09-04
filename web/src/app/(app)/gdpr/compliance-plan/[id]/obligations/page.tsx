import { getGdprObligationPlan } from "@/lib/actions/gdpr-obligations";
import { computeComplianceScore } from "@/lib/obligations/score";
import { DOSSIER_OBLIGATION_IDS, DPIA_OBLIGATION_ID } from "@/lib/gdpr-obligations/plan-meta";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StubActionButton } from "@/components/ui/stub-action-button";
import Link from "next/link";

export default async function GdprObligationsPage({
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

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="GDPR / Step 2"
        title="Obligations"
        subtitle={`${activity.name} — every duty this classification maps.`}
        actions={
          <Button variant="ghost" href={`/gdpr/inventory/${activity.id}`}>
            ← Processing Inventory
          </Button>
        }
      />

      <div className="p-8">
        {notClassified && (
          <div className="rounded-xl border border-transparent bg-gold-tint p-4 text-[13px] text-gold-deep">
            This activity hasn&rsquo;t been classified yet — obligations can&rsquo;t be mapped without a role.{" "}
            <Link href={`/gdpr/inventory/${activity.id}`} className="underline">
              Go to Processing Inventory & Classification
            </Link>
            .
          </div>
        )}

        {!notClassified && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-semibold text-ink">{activity.name}</span>
                <Tag tone="outline">{activity.role?.replace(/_/g, " ")}</Tag>
              </div>
              <p className="text-[12.5px] text-muted">
                {items.length} obligation{items.length === 1 ? "" : "s"} mapped · {score.openGaps} open gap
                {score.openGaps === 1 ? "" : "s"}
              </p>
            </div>

            {items.length === 0 && (
              <div className="mt-6 rounded-xl border border-hairline bg-surface p-4 text-[13px] text-muted shadow-sm">
                No obligations for this activity — none of its characteristics trigger a tied duty. General
                obligations (ROPA, security of processing, breach response, ...) still apply at the organization
                level — see the Overview tab.
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-6">
                <PanelHeading
                  title="Processing-activity obligations"
                  kicker="Feature 2.1"
                  action={<span className="text-[12px] text-muted">{items.length}</span>}
                />
                <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
                  {items.map(({ obligation, assessment }) => (
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
                        {obligation.id === DPIA_OBLIGATION_ID ? (
                          <Button variant="ghost" size="sm" href={`/gdpr/compliance-plan/${activity.id}/dpia`}>
                            Open DPIA →
                          </Button>
                        ) : (
                          DOSSIER_OBLIGATION_IDS.has(obligation.id) && (
                            <StubActionButton
                              label="Generate dossier"
                              notice={`A pre-filled ${obligation.title} template has been generated.`}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <Button variant="primary" href={`/gdpr/compliance-plan/${activity.id}/gap`}>
                Start gap assessment →
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
