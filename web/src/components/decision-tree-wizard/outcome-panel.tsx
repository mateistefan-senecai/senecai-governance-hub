import { Button } from "@/components/ui/button";
import type { Outcome } from "@/lib/decision-trees/types";
import type { CompletedRun } from "./use-multi-tree-run";

const RESULT_LABEL: Record<CompletedRun["resultField"], string> = {
  legalRole: "Legal role",
  riskClassification: "Risk classification",
};

function noteFor(outcomes: Outcome[]): string {
  if (outcomes.some((o) => o.value === "PROHIBITED")) {
    return "This escalates immediately to a consultant and blocks the system from being placed on the market.";
  }
  if (outcomes.some((o) => o.value === "HIGH_RISK")) {
    return "The full high-risk obligation set attaches to this system — see Obligations for the mapped obligations.";
  }
  return "Preliminary only, pending consultant review.";
}

export function OutcomePanel({
  completed,
  saving,
  onSave,
  onStartOver,
}: {
  completed: CompletedRun[];
  saving: boolean;
  onSave: () => void;
  onStartOver: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {completed.map((run) => (
          <div key={run.treeId} className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              {RESULT_LABEL[run.resultField]}
            </p>
            <p className="mt-1 text-[22px] font-semibold text-ink">{run.outcome.value.replace(/_/g, " ")}</p>
            {run.outcome.citation && (
              <p className="mt-1 font-narrow text-[11px] tracking-citation text-gold-hover">{run.outcome.citation}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-transparent bg-gold-tint p-4 text-[13px] text-gold-deep">
        {noteFor(completed.map((r) => r.outcome))}
      </div>

      <p className="mt-3 text-[11.5px] text-muted">
        Your answers, the tree version, and this outcome are stored as an audit trail on the AI system record.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save to record →"}
        </Button>
        <Button variant="ghost" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}
