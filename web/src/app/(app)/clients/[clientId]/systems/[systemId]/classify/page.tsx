import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireSystem } from "@/lib/authz";
import { getCurrentContent } from "@/lib/content/current";
import { submitClassificationAction } from "@/lib/actions/systems";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import type { Answers } from "@/lib/content/types";

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

  return (
    <>
      <PageHeader
        crumb={`Step 2 · Risk classification · ${system.name}`}
        title={current ? "Reclassify" : "Classify"}
        subtitle={`Role, scope, prohibited practices, high-risk test and transparency duties for ${system.name}. The result and its legal reasoning are computed from these answers, and obligations follow automatically.`}
        actions={<Button href={`/clients/${clientId}/systems/${systemId}`}>Cancel</Button>}
      />
      <div className="max-w-5xl p-8">
        <div className="mb-6 rounded-xl border border-hairline bg-panel px-5 py-3 text-[12.5px] text-muted">
          <span className="font-semibold text-ink">{system.name}</span> — {system.purpose}
          {content.status === "DRAFT" && (
            <span className="mt-1 block text-gold-deep">
              Legal content {content.version} is a draft pending legal review. Results are preliminary until a reviewer confirms them.
            </span>
          )}
        </div>
        <QuestionnaireForm
          questionnaire={content.classification}
          initial={(current?.answers as Answers | undefined) ?? {}}
          action={submitClassificationAction.bind(null, clientId, systemId)}
          submitLabel={current ? "Save new classification" : "Classify"}
        />
      </div>
    </>
  );
}
