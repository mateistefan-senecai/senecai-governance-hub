// The PDF deliverables of spec §4. Five of the six workflow steps produce a
// PDF (the evidence step does not: its result appears in the gap assessment
// as an evidence index), plus a combined pack.

import type { DocumentKind, DocumentState } from "@/generated/prisma/enums";

export type KindDef = {
  kind: DocumentKind;
  title: string;
  step: string;
  /** "Main provisions" column of the spec §4 table. */
  provisions: string;
  description: string;
};

export const DOCUMENT_KINDS: KindDef[] = [
  {
    kind: "INVENTORY",
    title: "AI inventory",
    step: "Step 1",
    provisions: "Arts. 3 and 26; Art. 4 (AI literacy)",
    description:
      "Every AI system the company builds, buys or embeds, with owner, supplier, purpose, data used, where deployed, and the company’s role for each.",
  },
  {
    kind: "CLASSIFICATION",
    title: "Risk classification",
    step: "Step 2",
    provisions: "Arts. 5, 6, 50; Annexes I and III",
    description:
      "For each system: role, prohibited-practice screen, high-risk test, transparency duties, and the reasoning behind each answer.",
  },
  {
    kind: "OBLIGATIONS",
    title: "Obligation mapping",
    step: "Step 3",
    provisions: "Arts. 8 to 27, 43, 47 to 49, 72, 73",
    description:
      "For each system, the obligations that follow from its classification, who carries them (provider or deployer), and the date each applies.",
  },
  {
    kind: "GAP_ASSESSMENT",
    title: "Gap assessment",
    step: "Step 5",
    provisions: "Same, plus linked evidence",
    description:
      "Each obligation scored compliant, partial or gap, with a readiness score and the reasons. Stage 1: an initial assessment from the questionnaire answers and the client interview.",
  },
  {
    kind: "ROADMAP",
    title: "Compliance roadmap",
    step: "Step 6",
    provisions: "All obligations in the gap assessment",
    description:
      "Prioritised actions in phases, each tagged legal or technical, with owner, effort and status, and a path to request implementation.",
  },
  {
    kind: "PACK",
    title: "Combined pack",
    step: "All steps",
    provisions: "Arts. 3 to 27, 43, 47 to 50, 72, 73; Annexes I and III",
    description: "The AI inventory, risk classification, obligation mapping, gap assessment and compliance roadmap in one PDF, under one cover and one review.",
  },
];

export const KIND_BY_ID = new Map(DOCUMENT_KINDS.map((k) => [k.kind, k]));

/** The modules a pack contains, in workflow order. */
export const MODULE_KINDS: Exclude<DocumentKind, "PACK">[] = ["INVENTORY", "CLASSIFICATION", "OBLIGATIONS", "GAP_ASSESSMENT", "ROADMAP"];

export const STATE_LABEL: Record<DocumentState, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  RELEASED: "Released to client",
};

export function isDocumentKind(v: string): v is DocumentKind {
  return KIND_BY_ID.has(v as DocumentKind);
}
