"use client";

import { useEffect } from "react";
import { useMultiTreeRun } from "./use-multi-tree-run";
import { StepRail } from "./step-rail";
import { QuestionBody } from "./question-body";
import { OutcomePanel } from "./outcome-panel";

const TREE_IDS = ["role-classification", "high-risk-classification"];

/** Runs both trees back-to-back in one modal. Dismissing (Close/backdrop/Escape) never writes anything. */
export function WizardModal({
  aiSystemId,
  aiSystemName,
  aiSystemPath,
  onClose,
}: {
  aiSystemId: string;
  aiSystemName: string;
  aiSystemPath: string;
  onClose: () => void;
}) {
  const run = useMultiTreeRun({ treeIds: TREE_IDS, aiSystemId });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-backdrop px-6 py-14"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto max-w-[760px] border-2 border-ink bg-white shadow-[0_24px_60px_rgba(22,19,15,0.35)]">
        <div className="flex items-start justify-between gap-4 bg-ink px-6 py-4">
          <div>
            <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-light">
              Features 1.2 &amp; 1.3 — decision trees
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">{aiSystemName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-muted px-3 py-1 text-[12px] text-white hover:bg-ink-hover"
          >
            Close
          </button>
        </div>

        <StepRail answeredCount={run.visited.length} done={run.done} />

        <div className="p-6">
          {!run.done && run.node && (
            <QuestionBody
              key={run.visited.length}
              node={run.node}
              onAnswerYesNo={run.answerYesNo}
              onSubmitChecklist={run.submitChecklist}
            />
          )}
          {run.done && (
            <OutcomePanel
              completed={run.completed}
              saving={run.saving}
              onSave={async () => {
                await run.save(aiSystemPath);
                onClose();
              }}
              onStartOver={run.reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
