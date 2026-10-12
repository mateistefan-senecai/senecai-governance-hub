import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { getCurrentContent } from "@/lib/content/current";
import { aiActApplies, type Finding } from "@/lib/services/inventory";
import { submitApplicability } from "@/lib/actions/clients";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { Citation } from "@/components/ui/citation";
import { formatDate } from "@/lib/labels";
import type { Answers, Firing } from "@/lib/content/types";

const APPLIES_LABEL = { yes: "Applies", likely: "Likely applies", no: "Does not apply" } as const;

export default async function ApplicabilityPage({ params }: PageProps<"/clients/[clientId]/applicability">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const { client, content } = await withTenant(ctx, async (tx) => ({
    client: await requireClient(tx, ctx, clientId),
    content: await getCurrentContent(tx),
  }));
  const result = client.applicability as { findings: Finding[]; reasoning: Firing[] } | null;

  return (
    <>
      <PageHeader
        crumb="Before the six steps"
        title="Applicability check"
        subtitle="A few questions about the company decide which regulations apply, each with the provision it rests on. A positive AI Act result opens the AI inventory."
      />
      <div className="grid gap-6 p-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <QuestionnaireForm
          questionnaire={content.applicability}
          initial={(client.profile as Answers | null) ?? {}}
          action={submitApplicability.bind(null, client.id)}
          submitLabel={result ? "Re-run the check" : "Run the check"}
        />

        <div className="space-y-4 xl:sticky xl:top-6">
          {!result ? (
            <Panel>
              <p className="text-[13.5px] text-muted">The result appears here once the check has been run.</p>
            </Panel>
          ) : (
            <Panel padded={false}>
              <div className="border-b border-hairline px-5 py-3">
                <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">Result</p>
                <p className="text-[12px] text-muted">
                  {formatDate(client.applicabilityAt)} · content {client.applicabilityContentVersion}
                </p>
              </div>
              <ul className="divide-y divide-hairline-light">
                {result.findings.map((f) => (
                  <li key={f.regulation} className={`px-5 py-3.5 ${f.coveredInThisVersion ? "" : "opacity-75"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13.5px] font-semibold text-ink">{f.name}</p>
                      <Tag tone={f.applies === "yes" ? (f.coveredInThisVersion ? "gold-fill" : "outline") : "muted"}>
                        {APPLIES_LABEL[f.applies]}
                      </Tag>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{f.summary}</p>
                    <Citation>{f.provision}</Citation>
                  </li>
                ))}
              </ul>
              {aiActApplies(client) && (
                <div className="border-t border-hairline px-5 py-3">
                  <Button variant="primary" href={`/clients/${client.id}/inventory`}>
                    Open the AI inventory →
                  </Button>
                </div>
              )}
            </Panel>
          )}
          {result && result.reasoning.length > 0 && (
            <Panel>
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">Why</p>
              <ul className="mt-2 space-y-2.5">
                {result.reasoning.map((r) => (
                  <li key={r.ruleId} className="text-[12.5px] leading-relaxed text-body">
                    {r.rationale} <Citation>{r.citation}</Citation>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
