"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTree } from "@/lib/decision-trees";
import {
  answerBoolean,
  answerChecklist,
  answerSignalChecklist,
  currentNode,
  startRun,
  type RunState,
  type StepResult,
} from "@/lib/decision-trees/engine";
import type { Outcome } from "@/lib/decision-trees/types";
import { recordDecisionRun } from "@/lib/actions/ai-systems";

export function DecisionTreeWizard({
  treeId,
  aiSystemId,
  onClose,
}: {
  treeId: string;
  aiSystemId: string;
  onClose: () => void;
}) {
  const tree = getTree(treeId);
  const router = useRouter();
  const [state, setState] = useState<RunState>(() => startRun(tree));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const node = outcome ? null : currentNode(tree, state);

  async function handleResult(result: StepResult) {
    if (result.done) {
      setOutcome(result.outcome);
      setSaving(true);
      await recordDecisionRun({
        aiSystemId,
        treeId: tree.id,
        treeVersion: tree.version,
        answers: result.state.answers,
        resultField: tree.resultField,
        resultValue: result.outcome.value,
      });
      setSaving(false);
      router.refresh();
    } else {
      setState(result.state);
      setChecked([]);
    }
  }

  if (outcome) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">
          Preliminary result:{" "}
          <span className="font-semibold">{outcome.value.replace(/_/g, " ")}</span>
        </p>
        {outcome.citation && (
          <p className="mt-1 text-xs text-slate-500">Citation: {outcome.citation}</p>
        )}
        {outcome.note && <p className="mt-1 text-xs text-slate-500">{outcome.note}</p>}
        <p className="mt-2 text-xs font-medium text-amber-700">
          Preliminary only — pending consultant review.
        </p>
        <button onClick={onClose} className="mt-3 text-sm text-slate-600 underline">
          {saving ? "Saving…" : "Close"}
        </button>
      </div>
    );
  }

  if (!node) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-900">{node.text}</p>
      {node.help && <p className="mt-1 text-xs text-slate-500">{node.help}</p>}

      {node.kind === "boolean" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleResult(answerBoolean(tree, state, true))}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
          >
            Yes
          </button>
          <button
            onClick={() => handleResult(answerBoolean(tree, state, false))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            No
          </button>
        </div>
      )}

      {(node.kind === "checklist" || node.kind === "signalChecklist") && (
        <div className="mt-3 space-y-2">
          {node.options.map((opt) => (
            <label key={opt.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked.includes(opt.id)}
                onChange={(e) =>
                  setChecked((prev) =>
                    e.target.checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id),
                  )
                }
                className="mt-1"
              />
              <span>
                {opt.label}
                {opt.citation && (
                  <span className="ml-1 text-xs text-slate-400">({opt.citation})</span>
                )}
                {opt.help && <span className="block text-xs text-slate-500">{opt.help}</span>}
              </span>
            </label>
          ))}
          <button
            onClick={() =>
              handleResult(
                node.kind === "checklist"
                  ? answerChecklist(tree, state, checked)
                  : answerSignalChecklist(tree, state, checked),
              )
            }
            className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
