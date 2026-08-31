import { getObligationPmHub } from "@/lib/actions/pm-steps";
import { togglePmStep } from "@/lib/actions/pm-steps";
import { setObligationStatus } from "@/lib/actions/obligations";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { StatusSegmentedForm } from "@/components/ui/status-segmented-form";

const PLAN_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IMPLEMENTED", label: "Done" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];

export default async function ObligationPmHubPage({
  params,
}: {
  params: Promise<{ id: string; obligationId: string }>;
}) {
  const { id, obligationId } = await params;
  const { system, obligation, assessment, steps } = await getObligationPmHub(id, obligationId);

  const doneCount = steps?.filter((s) => s.done).length ?? 0;

  return (
    <>
      <PageHeader
        crumb="AI Act / Obligations"
        title={obligation.title}
        subtitle={`${system.name} — ${obligation.citation}. ${obligation.description}`}
        actions={
          <Button variant="ghost" href={`/compliance-plan/${system.id}/obligations`}>
            ← Obligations
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-sm">
          <div>
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Status
            </p>
            <div className="mt-1.5">
              <Tag tone={assessment.status === "IMPLEMENTED" ? "ink-fill" : "muted"}>
                {assessment.status.replace(/_/g, " ")}
              </Tag>
            </div>
          </div>
          {steps === null && (
            <StatusSegmentedForm
              action={setObligationStatus}
              hiddenFields={{
                id: assessment.id,
                aiSystemId: system.id,
                redirectTo: `/compliance-plan/${system.id}/obligations/${obligation.id}`,
              }}
              activeValue={assessment.status}
              options={PLAN_STATUS_OPTIONS}
            />
          )}
        </div>

        {steps === null ? (
          <div className="mt-6 rounded-xl border border-hairline bg-panel p-5 text-[13px] leading-relaxed text-body shadow-sm">
            No step-by-step template is configured yet for this obligation type — set its status directly
            above. The PM sub-hub engine is generic (see{" "}
            <code className="font-mono text-[12px]">src/lib/obligations/pm-steps.json</code>); adding a
            template here is all that&rsquo;s needed to give this obligation its own checklist.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <h2 className="text-base font-semibold text-ink">Steps</h2>
              <span className="text-[12px] text-muted">
                {doneCount}/{steps.length} done
              </span>
            </div>
            <div className="divide-y divide-hairline">
              {steps.map((step, index) => (
                <form key={step.id} action={togglePmStep} className="flex items-center gap-4 px-5 py-3.5">
                  <input type="hidden" name="aiSystemId" value={system.id} />
                  <input type="hidden" name="obligationId" value={obligation.id} />
                  <input type="hidden" name="stepId" value={step.id} />
                  <input type="hidden" name="next" value={String(!step.done)} />
                  <button
                    type="submit"
                    aria-pressed={step.done}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ink text-[13px] font-semibold ${
                      step.done ? "bg-ink text-panel" : "bg-transparent text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <span className="font-narrow text-[10px] font-semibold text-label">{index + 1}.</span>
                  <button
                    type="submit"
                    className={`text-left text-[13.5px] ${step.done ? "text-muted line-through" : "text-ink"}`}
                  >
                    {step.label}
                  </button>
                </form>
              ))}
            </div>
            <p className="border-t border-hairline bg-panel px-5 py-3 text-[12px] leading-relaxed text-muted">
              Status rolls up automatically from these steps — all done marks the obligation
              &ldquo;Implemented&rdquo;, some done marks it &ldquo;In progress&rdquo;.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
