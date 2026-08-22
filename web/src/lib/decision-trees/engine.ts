import type {
  Answer,
  Branch,
  ConditionalBranch,
  DecisionTree,
  Outcome,
  TreeNode,
} from "./types";

export type RunState = {
  nodeId: string;
  flags: string[];
  answers: Answer[];
};

export function startRun(tree: DecisionTree): RunState {
  return { nodeId: tree.entry, flags: [], answers: [] };
}

export function currentNode(tree: DecisionTree, state: RunState): TreeNode {
  const node = tree.nodes[state.nodeId];
  if (!node) {
    throw new Error(`Unknown node "${state.nodeId}" in tree "${tree.id}"`);
  }
  return node;
}

export type StepResult =
  | { done: false; state: RunState }
  | { done: true; outcome: Outcome; state: RunState };

export function answerBoolean(
  tree: DecisionTree,
  state: RunState,
  value: boolean,
): StepResult {
  const node = currentNode(tree, state);
  if (node.kind !== "boolean") {
    throw new Error(`Node "${node.id}" is not a boolean node`);
  }
  const branch = value ? node.onYes : node.onNo;
  const flags =
    value && node.setFlagOnYes ? [...state.flags, node.setFlagOnYes] : state.flags;
  const answers: Answer[] = [
    ...state.answers,
    { nodeId: node.id, kind: "boolean", value },
  ];
  return finish(branch, { nodeId: state.nodeId, flags, answers });
}

export function answerChecklist(
  tree: DecisionTree,
  state: RunState,
  checked: string[],
): StepResult {
  const node = currentNode(tree, state);
  if (node.kind !== "checklist") {
    throw new Error(`Node "${node.id}" is not a checklist node`);
  }
  const newFlags = node.options
    .filter((o) => checked.includes(o.id) && o.setFlag)
    .map((o) => o.setFlag as string);
  const flags = [...state.flags, ...newFlags];
  const answers: Answer[] = [
    ...state.answers,
    { nodeId: node.id, kind: "checklist", checked },
  ];
  const branch =
    checked.length > 0
      ? resolveConditional(node.onAnyChecked, flags)
      : node.onNoneChecked;
  return finish(branch, { nodeId: state.nodeId, flags, answers });
}

export function answerSignalChecklist(
  tree: DecisionTree,
  state: RunState,
  checked: string[],
): StepResult {
  const node = currentNode(tree, state);
  if (node.kind !== "signalChecklist") {
    throw new Error(`Node "${node.id}" is not a signalChecklist node`);
  }
  const signals = new Set(
    node.options.filter((o) => checked.includes(o.id)).map((o) => o.signal),
  );
  const answers: Answer[] = [
    ...state.answers,
    { nodeId: node.id, kind: "signalChecklist", checked },
  ];
  let branch: Branch;
  if (signals.size === 0) {
    branch = node.onNoSignals;
  } else if (signals.size === 1) {
    branch = node.onlySignal[[...signals][0]];
  } else {
    branch = node.onMultipleSignals;
  }
  return finish(branch, { nodeId: state.nodeId, flags: state.flags, answers });
}

function resolveConditional(
  onAnyChecked: { conditions?: ConditionalBranch[]; default: Branch },
  flags: string[],
): Branch {
  for (const condition of onAnyChecked.conditions ?? []) {
    if (flags.includes(condition.ifFlag)) return condition.then;
  }
  return onAnyChecked.default;
}

function finish(branch: Branch, state: RunState): StepResult {
  if (branch.kind === "outcome") {
    return { done: true, outcome: branch.outcome, state };
  }
  return { done: false, state: { ...state, nodeId: branch.nodeId } };
}
