// Generic engine for "decision trees as configurable data" (see
// docs/context/ai-act-platform-concept.md, architecture principles).
// A tree is pure JSON — no regulation-specific logic lives in code here,
// so the same engine drives AI Act role/risk classification today and
// GDPR/DORA/NIS2/CRA trees later without a rewrite.

export type Outcome = {
  /** The classification value this node resolves to, e.g. "PROVIDER". */
  value: string;
  /** True until a consultant confirms it — always true for now. */
  tentative: true;
  /** Legal citation backing this outcome, e.g. "Art. 25(1)(a)". */
  citation?: string;
  note?: string;
};

export type Branch =
  | { kind: "goto"; nodeId: string }
  | { kind: "outcome"; outcome: Outcome };

export type ConditionalBranch = {
  /** Evaluated against the run's accumulated flags; first match wins. */
  ifFlag: string;
  then: Branch;
};

export type BooleanNode = {
  kind: "boolean";
  id: string;
  text: string;
  help?: string;
  citation?: string;
  onYes: Branch;
  onNo: Branch;
  /** Flag added to the run's context when the answer is "yes". */
  setFlagOnYes?: string;
};

export type ChecklistOption = {
  id: string;
  label: string;
  help?: string;
  citation?: string;
  /** Flag added to the run's context when this option is checked. */
  setFlag?: string;
};

export type ChecklistNode = {
  kind: "checklist";
  id: string;
  text: string;
  help?: string;
  options: ChecklistOption[];
  /** Used when at least one option is checked; conditions checked in order, `default` if none match. */
  onAnyChecked: { conditions?: ConditionalBranch[]; default: Branch };
  onNoneChecked: Branch;
};

// The role-classification checklist doesn't branch sequentially — the
// source document has the reader tick every applicable box across all
// six steps, then combines them ("If you selected any Provider boxes...").
// This node type is that combination rule, expressed as data.
export type SignalChecklistOption = {
  id: string;
  label: string;
  help?: string;
  citation?: string;
  signal: string;
};

export type SignalChecklistNode = {
  kind: "signalChecklist";
  id: string;
  text: string;
  help?: string;
  options: SignalChecklistOption[];
  /** Outcome/goto when exactly one distinct signal was ticked, keyed by signal name. */
  onlySignal: Record<string, Branch>;
  /** Outcome/goto when 2+ distinct signals were ticked. */
  onMultipleSignals: Branch;
  /** Outcome/goto when nothing was ticked. */
  onNoSignals: Branch;
};

export type TreeNode = BooleanNode | ChecklistNode | SignalChecklistNode;

export type DecisionTree = {
  id: string;
  version: number;
  title: string;
  /** Which AiSystem field this tree's outcome feeds, e.g. "legalRole". */
  resultField: "legalRole" | "riskClassification";
  entry: string;
  nodes: Record<string, TreeNode>;
  sourceDoc: string;
};

export type Answer =
  | { nodeId: string; kind: "boolean"; value: boolean }
  | { nodeId: string; kind: "checklist"; checked: string[] }
  | { nodeId: string; kind: "signalChecklist"; checked: string[] };

export type RunResult = {
  outcome: Outcome;
  path: Answer[];
};
