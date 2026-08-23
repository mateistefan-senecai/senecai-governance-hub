"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Answer, Outcome } from "@/lib/decision-trees/types";
import { recordDecisionRun } from "@/lib/actions/ai-systems";

export type VisitedStep = { treeId: string; nodeId: string };

export type CompletedRun = {
  treeId: string;
  treeVersion: number;
  resultField: "legalRole" | "riskClassification";
  outcome: Outcome;
  answers: Answer[];
};

/**
 * Drives N trees back-to-back through the existing, untouched decision-tree
 * engine (engine.ts) — no regulation-specific logic lives here, only
 * sequencing. Each tree's answers/outcome are held locally until `save()`
 * is called (the wizard's "Save to record →" step), rather than writing to
 * the AiSystem record as each tree finishes.
 */
export function useMultiTreeRun({ treeIds, aiSystemId }: { treeIds: string[]; aiSystemId: string }) {
  const trees = treeIds.map((id) => getTree(id));
  const router = useRouter();

  const [treeIndex, setTreeIndex] = useState(0);
  const [runState, setRunState] = useState<RunState>(() => startRun(trees[0]));
  const [visited, setVisited] = useState<VisitedStep[]>([]);
  const [completed, setCompleted] = useState<CompletedRun[]>([]);
  const [saving, setSaving] = useState(false);

  const tree = trees[treeIndex];
  const done = treeIndex >= trees.length;
  const node = done ? null : currentNode(tree, runState);

  function handleResult(result: StepResult) {
    if (node) setVisited((prev) => [...prev, { treeId: tree.id, nodeId: node.id }]);

    if (!result.done) {
      setRunState(result.state);
      return;
    }

    setCompleted((prev) => [
      ...prev,
      {
        treeId: tree.id,
        treeVersion: tree.version,
        resultField: tree.resultField,
        outcome: result.outcome,
        answers: result.state.answers,
      },
    ]);

    const nextIndex = treeIndex + 1;
    setTreeIndex(nextIndex);
    if (nextIndex < trees.length) {
      setRunState(startRun(trees[nextIndex]));
    }
  }

  function answerYesNo(value: boolean) {
    if (node?.kind === "boolean") handleResult(answerBoolean(tree, runState, value));
  }

  function submitChecklist(checked: string[]) {
    if (node?.kind === "checklist") handleResult(answerChecklist(tree, runState, checked));
    else if (node?.kind === "signalChecklist") handleResult(answerSignalChecklist(tree, runState, checked));
  }

  function reset() {
    setTreeIndex(0);
    setRunState(startRun(trees[0]));
    setVisited([]);
    setCompleted([]);
  }

  async function save(aiSystemPath: string) {
    setSaving(true);
    for (const run of completed) {
      await recordDecisionRun({
        aiSystemId,
        treeId: run.treeId,
        treeVersion: run.treeVersion,
        answers: run.answers,
        resultField: run.resultField,
        resultValue: run.outcome.value,
      });
    }
    setSaving(false);
    router.push(`${aiSystemPath}?notice=${encodeURIComponent("Classification saved — pending consultant review.")}`);
  }

  return { node, done, visited, completed, saving, answerYesNo, submitChecklist, reset, save };
}
