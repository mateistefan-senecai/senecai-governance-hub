// Round-2 spec Section 4 — obligation-level PM sub-hub step templates as
// configurable data, same "rules as data" principle as catalog.json and the
// decision trees: adding/editing a template never touches engine code.
//
// Only two example templates are populated ("Risk management" and "Human
// oversight design", per the spec's own examples) — the full taxonomy for
// every obligation type is still to be supplied; any obligation without an
// entry here just falls back to the plain status control on its PM hub
// screen instead of a step checklist.

import pmStepsJson from "./pm-steps.json";

export type PmStep = { id: string; label: string };

export const PM_STEPS: Record<string, PmStep[]> = pmStepsJson;

export function getPmSteps(obligationId: string): PmStep[] | null {
  return PM_STEPS[obligationId] ?? null;
}
