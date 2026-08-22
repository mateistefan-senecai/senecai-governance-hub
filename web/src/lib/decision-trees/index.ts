import type { Branch, DecisionTree } from "./types";
import roleClassification from "./trees/role-classification.json";
import highRiskClassification from "./trees/high-risk-classification.json";

export const trees: Record<string, DecisionTree> = {
  [roleClassification.id]: roleClassification as DecisionTree,
  [highRiskClassification.id]: highRiskClassification as DecisionTree,
};

export function getTree(id: string): DecisionTree {
  const tree = trees[id];
  if (!tree) throw new Error(`Unknown decision tree "${id}"`);
  return tree;
}

/** Every `goto` must point at a node that exists in the same tree. */
export function validateTree(tree: DecisionTree): string[] {
  const errors: string[] = [];
  const checkBranch = (branch: Branch, from: string) => {
    if (branch.kind === "goto" && !tree.nodes[branch.nodeId]) {
      errors.push(`${tree.id}: node "${from}" goes to missing node "${branch.nodeId}"`);
    }
  };
  for (const node of Object.values(tree.nodes)) {
    if (node.kind === "boolean") {
      checkBranch(node.onYes, node.id);
      checkBranch(node.onNo, node.id);
    } else if (node.kind === "checklist") {
      for (const c of node.onAnyChecked.conditions ?? []) checkBranch(c.then, node.id);
      checkBranch(node.onAnyChecked.default, node.id);
      checkBranch(node.onNoneChecked, node.id);
    } else if (node.kind === "signalChecklist") {
      for (const branch of Object.values(node.onlySignal)) checkBranch(branch, node.id);
      checkBranch(node.onMultipleSignals, node.id);
      checkBranch(node.onNoSignals, node.id);
    }
  }
  if (!tree.nodes[tree.entry]) {
    errors.push(`${tree.id}: entry node "${tree.entry}" does not exist`);
  }
  return errors;
}
