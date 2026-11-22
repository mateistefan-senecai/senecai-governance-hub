import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireSystem } from "@/lib/authz";
import { getCurrentContent } from "@/lib/content/current";
import { submitClassificationAction } from "@/lib/actions/systems";
import { evaluate } from "@/lib/content/engine";
import { factLabels, factQuestions, missingFacts, systemAnswers } from "@/lib/content/facts";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/labels";
import type { Answers, SystemFactField } from "@/lib/content/types";

const FACT_LABEL: Record<SystemFactField, string> = {
  origin: "Origin",
  useType: "Use",
  stage: "Stage",
  areas: "Area of use",
  affectedGroups: "Used by or affecting",
  capabilities: "What it does",
};

export default async function ClassifyPage({ params }: PageProps<"/clients/[clientId]/systems/[systemId]/classify">) {
  const { clientId, systemId } = await params;
  const ctx = await getCtx();
  const { system, current, content } = await withTenant(ctx, async (tx) => {
    const { system } = await requireSystem(tx, ctx, clientId, systemId);
    return {
      system,
      current: await tx.classification.findFirst({ where: { systemId, isCurrent: true } }),
      content: await getCurrentContent(tx),
    };
  });
  const systemHref = `/clients/${clientId}/systems/${systemId}`;
  const missing = missingFacts(content.classification, system);
  const fixed = systemAnswers(content.classification, system);
  // The role as far as origin and use settle it; for bought systems it depends on questions below.
  const roles = (evaluate(content.classification, fixed).outputs.roles as string[]) ?? [];
  const roleText = roles.length
    ? roles.map((r) => ROLE_LABEL[r] ?? r).join(" and ")
    : "Depends on the questions below (bought from a supplier)";

  return (
    <>
      <PageHeader
        crumb={`Step 2 · Risk classification · ${system.name}`}
        title={current ? "Reclassify" : "Classify"}
        subtitle="Only what the AI system record does not settle is asked here. The result and its legal reasoning follow from these answers, and the obligations follow from the result."
        actions={<Button href={systemHref}>Cancel</Button>}
      />
      <div className="max-w-5xl space-y-6 p-8">
        {content.status === "DRAFT" && (
          <p className="rounded-xl border border-hairline bg-panel px-5 py-3 text-[12.5px] text-gold-deep">
            Legal content {content.version} is a draft pending legal review. Results are preliminary until a reviewer confirms them.
          </p>
        )}

        {missing.length > 0 ? (
          <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-sm">
            <h2 className="font-display text-[19px] font-semibold text-ink">Complete the system record first</h2>
            <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-muted">
              The classification reads where and on whom {system.name} is used and what it does. Missing:{" "}
              {missing.map((q) => q.text.toLowerCase()).join(", ")}.
            </p>
            <div className="mt-4">
              <Button variant="primary" href={`${systemHref}/edit`}>
                Complete the record →
              </Button>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-hairline bg-surface shadow-sm">
              <div className="border-b border-hairline px-6 py-4">
                <p className="font-mono text-[11px] font-medium tracking-micro-wide text-gold">ALREADY KNOWN</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold text-ink">Taken from the system record</h2>
              </div>
              <dl className="grid gap-x-6 gap-y-2.5 px-6 py-5 text-[13.5px] sm:grid-cols-[180px_1fr]">
                <dt className="font-mono text-[11px] tracking-micro text-label">ROLE</dt>
                <dd className="text-ink">{roleText}</dd>
                {factQuestions(content.classification).map((q) => {
                  const labels = factLabels(q, system[q.fromSystem!] as string | string[]);
                  return (
                    <div key={q.id} className="contents">
                      <dt className="font-mono text-[11px] uppercase tracking-micro text-label">{FACT_LABEL[q.fromSystem!]}</dt>
                      <dd className="text-ink">{labels.length ? labels.join(" · ") : <span className="text-muted">None ticked</span>}</dd>
                    </div>
                  );
                })}
              </dl>
              <div className="px-6 pb-5">
                <a href={`${systemHref}/edit`} className="text-[12.5px] font-semibold text-gold-hover hover:underline">
                  Something wrong? Edit the system record →
                </a>
              </div>
            </section>

            <QuestionnaireForm
              questionnaire={content.classification}
              initial={(current?.answers as Answers | undefined) ?? {}}
              fixed={fixed}
              preview={{ obligations: content.obligations, dates: content.dates }}
              action={submitClassificationAction.bind(null, clientId, systemId)}
              submitLabel={current ? "Save new classification" : "Classify"}
            />
          </>
        )}
      </div>
    </>
  );
}
