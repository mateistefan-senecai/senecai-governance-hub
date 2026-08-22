import { trees, validateTree } from "../src/lib/decision-trees";
import {
  answerBoolean,
  answerChecklist,
  answerSignalChecklist,
  startRun,
  currentNode,
  type RunState,
} from "../src/lib/decision-trees/engine";
import { obligationCatalog, validateCatalog } from "../src/lib/obligations";

let hadError = false;

const catalogErrors = validateCatalog();
if (catalogErrors.length) {
  hadError = true;
  console.error(`✗ obligations catalog has structural errors:`);
  for (const e of catalogErrors) console.error(`  - ${e}`);
} else {
  console.log(`✓ obligations catalog structurally valid (${obligationCatalog.length} obligations)`);
}

for (const tree of Object.values(trees)) {
  const errors = validateTree(tree);
  if (errors.length) {
    hadError = true;
    console.error(`✗ ${tree.id} has structural errors:`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    console.log(`✓ ${tree.id} structurally valid (${Object.keys(tree.nodes).length} nodes)`);
  }
}

// Smoke-test a few real paths end to end.

function runSignalPath(treeId: string, checkedByStep: string[][]) {
  const tree = trees[treeId];
  let state: RunState = startRun(tree);
  for (const checked of checkedByStep) {
    const node = currentNode(tree, state);
    const result =
      node.kind === "boolean"
        ? answerBoolean(tree, state, checked[0] === "yes")
        : node.kind === "checklist"
          ? answerChecklist(tree, state, checked)
          : answerSignalChecklist(tree, state, checked);
    if (result.done) return result.outcome;
    state = result.state;
  }
  throw new Error("Path did not terminate");
}

const cases: [string, string[][], string][] = [
  // Role: only deployer signal ticked -> DEPLOYER
  ["role-classification", [["deployer-use"]], "DEPLOYER"],
  // Role: only a provider signal ticked -> PROVIDER
  ["role-classification", [["provider-whitelabel"]], "PROVIDER"],
  // Role: both -> BOTH
  ["role-classification", [["deployer-use", "provider-original"]], "BOTH"],
  // Role: nothing ticked, as-is fallback yes -> DEPLOYER
  ["role-classification", [[], ["yes"]], "DEPLOYER"],
  // Role: nothing ticked, as-is fallback no -> REVIEW_REQUIRED
  ["role-classification", [[], ["no"]], "REVIEW_REQUIRED"],
  // High-risk: exclusion ticked -> OUT_OF_SCOPE
  ["high-risk-classification", [["personal-use"]], "OUT_OF_SCOPE"],
  // High-risk: Annex I ticked -> HIGH_RISK
  ["high-risk-classification", [[], ["medical-devices"]], "HIGH_RISK"],
  // High-risk: nothing anywhere -> NOT_HIGH_RISK
  ["high-risk-classification", [[], [], [], []], "NOT_HIGH_RISK"],
  // High-risk: Annex III (non-profiling) + exemption ticked -> NOT_HIGH_RISK
  ["high-risk-classification", [[], [], ["hr-recruitment"], ["narrow-procedural"]], "NOT_HIGH_RISK"],
  // High-risk: Annex III profiling item + exemption ticked -> HIGH_RISK (override)
  ["high-risk-classification", [[], [], ["biometric-categorization"], ["narrow-procedural"]], "HIGH_RISK"],
  // High-risk: practical-rights ticked, no exemption -> HIGH_RISK
  ["high-risk-classification", [[], [], [], ["rights-finance"], []], "HIGH_RISK"],
];

for (const [treeId, steps, expected] of cases) {
  const outcome = runSignalPath(treeId, steps);
  const ok = outcome.value === expected;
  if (!ok) hadError = true;
  console.log(
    `${ok ? "✓" : "✗"} ${treeId} ${JSON.stringify(steps)} -> ${outcome.value} (expected ${expected})`,
  );
}

process.exit(hadError ? 1 : 0);
