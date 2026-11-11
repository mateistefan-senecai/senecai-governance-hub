// The written parts of a deliverable.
//
// Spec §6 and concept note §7: AI is to draft the narrative of each PDF,
// under reviewer approval. The AI provider is an open decision (spec §12),
// so Stage 1 fills the narrative from the deterministic data only: rule
// rationales, obligation summaries and reviewer rationales. Nothing here
// calls a model.
//
// An AI drafter can later implement `NarrativeDrafter` with source "AI".
// Its output has the same shape: every statement carries the provisions it
// relies on, so the reviewer can check it, and the document goes through the
// same states (draft → in review → approved → released). The structured
// tables of the PDF (classification, obligations, dates, statuses) always
// come from the snapshot, never from the narrative.

import type { DocumentKind } from "@/generated/prisma/enums";
import type { Snapshot, SystemSnap } from "./snapshot";

export type Statement = { text: string; citations: string[] };
export type NarrativeSection = { id: string; heading: string; statements: Statement[] };
export type Narrative = { sections: NarrativeSection[] };

export interface NarrativeDrafter {
  /** Stored on the document as `narrativeSource`. */
  readonly source: "RULES" | "AI";
  draft(snapshot: Snapshot): Promise<Narrative>;
}

const RISK = { PROHIBITED: "prohibited", HIGH_RISK: "high-risk", LIMITED: "limited-risk", MINIMAL: "minimal-risk", OUT_OF_SCOPE: "out of scope" } as Record<string, string>;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function inventorySummary(s: Snapshot): Statement[] {
  const n = s.systems.length;
  const by = (o: string) => s.systems.filter((x) => x.origin === o).length;
  const classified = s.systems.filter((x) => x.classification).length;
  const out: Statement[] = [
    {
      text: `The inventory records ${plural(n, "AI system")}: ${by("BUILT")} built in-house, ${by("BOUGHT")} bought and ${by("EMBEDDED")} embedded in other products or services. ${classified} of them ${classified === 1 ? "has" : "have"} been classified.`,
      citations: ["Art. 3(1)"],
    },
  ];
  const deployer = s.systems.filter((x) => x.classification?.roles.includes("deployer")).length;
  const provider = s.systems.filter((x) => x.classification?.roles.includes("provider")).length;
  if (classified) {
    out.push({
      text: `The company acts as provider for ${plural(provider, "system")} and as deployer for ${plural(deployer, "system")}. Deployers must use high-risk systems in line with their instructions for use, assign human oversight and keep the logs under their control.`,
      citations: ["Art. 3(3)", "Art. 3(4)", "Art. 26"],
    });
  }
  out.push({
    text: "Providers and deployers must take measures to ensure a sufficient level of AI literacy among staff who operate or use these systems.",
    citations: ["Art. 4"],
  });
  return out;
}

function classificationSummary(s: Snapshot): Statement[] {
  const out: Statement[] = [];
  for (const sys of s.systems) {
    const c = sys.classification;
    if (!c) {
      out.push({ text: `${sys.name} has not been classified yet.`, citations: [] });
      continue;
    }
    const cites = [...new Set(c.reasoning.map((r) => r.citation))];
    const roles = c.roles.length ? ` The company acts as ${c.roles.join(" and ")}.` : "";
    const review =
      c.status === "OVERRIDDEN"
        ? ` A reviewer overrode the computed result (${RISK[c.computedRiskClass] ?? c.computedRiskClass}): ${c.overrideReason}`
        : c.status === "CONFIRMED"
          ? " A reviewer confirmed the result."
          : " The result is preliminary and has not yet been reviewed.";
    out.push({ text: `${sys.name} is classified as ${RISK[c.riskClass] ?? c.riskClass}.${roles}${review}`, citations: cites });
  }
  return out;
}

function obligationSummary(s: Snapshot): Statement[] {
  const out: Statement[] = [];
  for (const sys of s.systems) {
    if (!sys.classification) continue;
    if (!sys.obligations.length) {
      out.push({ text: `No obligations follow from the classification of ${sys.name}.`, citations: [] });
      continue;
    }
    const parties = [...new Set(sys.obligations.flatMap((o) => o.party.split(" & ")))];
    const n = sys.obligations.length;
    out.push({
      text: `${plural(n, "obligation")} ${n === 1 ? "applies" : "apply"} to ${sys.name}, carried by the company as ${parties.join(" and ")}.`,
      citations: [...new Set(sys.obligations.map((o) => o.article))],
    });
  }
  return out;
}

function counts(systems: SystemSnap[]) {
  const all = systems.flatMap((x) => x.obligations);
  const n = (st: string) => all.filter((o) => o.status === st).length;
  return { total: all.length, compliant: n("COMPLIANT"), partial: n("PARTIAL"), gap: n("GAP"), open: n("NOT_ASSESSED") };
}

function gapSummary(s: Snapshot): Statement[] {
  const c = counts(s.systems);
  const out: Statement[] = [
    {
      text: `Of ${plural(c.total, "applicable obligation")}, ${c.compliant} ${c.compliant === 1 ? "is" : "are"} assessed as compliant, ${c.partial} as partial and ${c.gap} as gap; ${c.open} ${c.open === 1 ? "is" : "are"} not yet assessed. Overall readiness: ${s.overallReadiness == null ? "not yet measurable" : `${s.overallReadiness}%`}.`,
      citations: [],
    },
    {
      text: "This is the initial assessment of Stage 1: the reviewer built it from the classification answers and the client interview. Evidence has not yet been collected against each obligation; the evidence index lists the evidence the legal content expects.",
      citations: [],
    },
  ];
  for (const sys of s.systems) {
    for (const o of sys.obligations) {
      if ((o.status === "GAP" || o.status === "PARTIAL") && o.statusRationale) {
        out.push({ text: `${sys.name}, ${o.title}: ${o.statusRationale}`, citations: [o.article] });
      }
    }
  }
  return out;
}

function roadmapSummary(s: Snapshot): Statement[] {
  const actions = (s.actions ?? []).filter((a) => a.status !== "DONE");
  const phase = (p: number) => actions.filter((a) => a.phase === p).length;
  return [
    {
      text: `${plural(actions.length, "open action")}: ${phase(1)} in phase 1 (now), ${phase(2)} in phase 2 (next) and ${phase(3)} in phase 3 (later). ${actions.filter((a) => a.type === "LEGAL").length} legal and ${actions.filter((a) => a.type === "TECHNICAL").length} technical.`,
      citations: [...new Set(actions.map((a) => a.article))],
    },
    {
      text: "Phase 1 covers obligations that already apply or apply within six months; phase 2 those that apply within eighteen months, or small pieces of work; phase 3 the rest. Each action closes when its obligation is assessed as compliant.",
      citations: [],
    },
  ];
}

const SECTIONS: Record<Exclude<DocumentKind, "PACK">, { heading: string; build: (s: Snapshot) => Statement[] }> = {
  INVENTORY: { heading: "Inventory summary", build: inventorySummary },
  CLASSIFICATION: { heading: "Classification summary", build: classificationSummary },
  OBLIGATIONS: { heading: "Obligation summary", build: obligationSummary },
  GAP_ASSESSMENT: { heading: "Assessment summary", build: gapSummary },
  ROADMAP: { heading: "Roadmap summary", build: roadmapSummary },
};

/** Stage 1 drafter: deterministic, from the snapshot only. */
export const rulesDrafter: NarrativeDrafter = {
  source: "RULES",
  async draft(snapshot) {
    const kinds = snapshot.kind === "PACK" ? (Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]) : [snapshot.kind];
    return {
      sections: kinds.map((k) => ({ id: k, heading: SECTIONS[k].heading, statements: SECTIONS[k].build(snapshot) })),
    };
  },
};
