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
import type { Snapshot } from "./snapshot";

export type Statement = { text: string; citations: string[] };
export type NarrativeSection = { id: string; heading: string; statements: Statement[] };
export type Narrative = { sections: NarrativeSection[] };

export interface NarrativeDrafter {
  /** Stored on the document as `narrativeSource`. */
  readonly source: "RULES" | "AI";
  draft(snapshot: Snapshot): Promise<Narrative>;
}

const RISK = { PROHIBITED: "Prohibited", HIGH_RISK: "High-risk", LIMITED: "Limited risk", MINIMAL: "Minimal risk", OUT_OF_SCOPE: "Out of scope" } as Record<string, string>;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Key words are wrapped in **…**: the PDF prints them in bold. */
const b = (x: string | number) => `**${x}**`;
const roleWords = (roles: string[]) => roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(" and ");

// Summaries are short bullet points, not narrative: one fact per statement,
// with its key words highlighted.

function inventorySummary(s: Snapshot): Statement[] {
  const n = s.systems.length;
  const by = (o: string) => s.systems.filter((x) => x.origin === o).length;
  const classified = s.systems.filter((x) => x.classification).length;
  const out: Statement[] = [
    {
      text: `${b(plural(n, "AI system"))} recorded: ${b(`${by("BUILT")} built`)} in-house, ${b(`${by("BOUGHT")} bought`)}, ${b(`${by("EMBEDDED")} embedded`)}`,
      citations: ["Art. 3(1)"],
    },
    { text: `${b(`${classified} classified`)}${n - classified ? `, ${b(`${n - classified} not yet classified`)}` : ""}`, citations: [] },
  ];
  const deployer = s.systems.filter((x) => x.classification?.roles.includes("deployer")).length;
  const provider = s.systems.filter((x) => x.classification?.roles.includes("provider")).length;
  if (classified) {
    out.push({ text: `Company role: ${b("Provider")} for ${plural(provider, "system")}, ${b("Deployer")} for ${plural(deployer, "system")}`, citations: ["Art. 3(3)", "Art. 3(4)"] });
    const highRisk = s.systems.filter((x) => x.classification?.riskClass === "HIGH_RISK").length;
    if (highRisk) out.push({ text: `${b(plural(highRisk, "high-risk system"))}`, citations: ["Art. 6"] });
    out.push({ text: `${b("AI literacy")} applies ${b("once to the company")} as a whole, not to each system`, citations: ["Art. 4"] });
  }
  return out;
}

function classificationSummary(s: Snapshot): Statement[] {
  const out: Statement[] = [];
  for (const sys of s.systems) {
    const c = sys.classification;
    if (!c) {
      out.push({ text: `${b(sys.name)}: ${b("not classified yet")}`, citations: [] });
      continue;
    }
    const cites = [...new Set(c.reasoning.map((r) => r.citation))];
    const review =
      c.status === "OVERRIDDEN"
        ? `${b("overridden")} by the reviewer (computed: ${RISK[c.computedRiskClass] ?? c.computedRiskClass})`
        : c.status === "CONFIRMED"
          ? `${b("confirmed")} by the reviewer`
          : `${b("preliminary")}, not yet reviewed`;
    const parts = [`${b(sys.name)}: ${b(RISK[c.riskClass] ?? c.riskClass)}`];
    if (c.roles.length) parts.push(b(roleWords(c.roles)));
    parts.push(review);
    out.push({ text: parts.join(" · "), citations: cites });
  }
  return out;
}

function obligationSummary(s: Snapshot): Statement[] {
  const out: Statement[] = [];
  const company = s.companyObligations ?? [];
  if (company.length) {
    out.push({
      text: `${b("Company-wide")}: ${b(plural(company.length, "obligation"))} (${company.map((o) => o.title).join(", ")})`,
      citations: company.map((o) => o.article),
    });
  }
  for (const sys of s.systems) {
    if (!sys.classification) continue;
    if (!sys.obligations.length) {
      out.push({ text: `${b(sys.name)}: ${b("no obligations")} follow from the classification`, citations: [] });
      continue;
    }
    const parties = [...new Set(sys.obligations.flatMap((o) => o.party.split(" & ")))];
    out.push({
      text: `${b(sys.name)}: ${b(plural(sys.obligations.length, "obligation"))} as ${b(roleWords(parties))}`,
      citations: [...new Set(sys.obligations.map((o) => o.article))],
    });
  }
  return out;
}

function counts(s: Snapshot) {
  const all = [...(s.companyObligations ?? []), ...s.systems.flatMap((x) => x.obligations)];
  const n = (st: string) => all.filter((o) => o.status === st).length;
  return { total: all.length, compliant: n("COMPLIANT"), partial: n("PARTIAL"), gap: n("GAP"), open: n("NOT_ASSESSED") };
}

function gapSummary(s: Snapshot): Statement[] {
  const c = counts(s);
  const out: Statement[] = [
    {
      text: `${b(plural(c.total, "applicable obligation"))}: ${b(`${c.compliant} compliant`)}, ${b(`${c.partial} partial`)}, ${b(`${c.gap} gap`)}, ${b(`${c.open} not assessed`)}`,
      citations: [],
    },
    { text: `Overall readiness: ${b(s.overallReadiness == null ? "not yet measurable" : `${s.overallReadiness}%`)}`, citations: [] },
    { text: `${b("Initial assessment")} (Stage 1), built from the classification answers and the ${b("client interview")}; evidence not yet collected`, citations: [] },
  ];
  const groups = [{ name: "Company-wide", obligations: s.companyObligations ?? [] }, ...s.systems];
  for (const sys of groups) {
    for (const o of sys.obligations) {
      if ((o.status === "GAP" || o.status === "PARTIAL") && o.statusRationale) {
        out.push({ text: `${b(`${sys.name} · ${o.title}`)} (${b(o.status === "GAP" ? "gap" : "partial")}): ${o.statusRationale}`, citations: [o.article] });
      }
    }
  }
  return out;
}

function roadmapSummary(s: Snapshot): Statement[] {
  const actions = (s.actions ?? []).filter((a) => a.status !== "DONE");
  const phase = (p: number) => actions.filter((a) => a.phase === p).length;
  return [
    { text: `${b(plural(actions.length, "open action"))}`, citations: [...new Set(actions.map((a) => a.article))] },
    { text: `${b(`Phase 1 (now): ${phase(1)}`)} · ${b(`Phase 2 (next): ${phase(2)}`)} · ${b(`Phase 3 (later): ${phase(3)}`)}`, citations: [] },
    { text: `${b(`${actions.filter((a) => a.type === "LEGAL").length} legal`)} · ${b(`${actions.filter((a) => a.type === "TECHNICAL").length} technical`)}`, citations: [] },
    { text: `Phase 1: applies ${b("already or within six months")}; phase 2: ${b("within eighteen months")} or small work; phase 3: the rest`, citations: [] },
    { text: `An action ${b("closes")} when its obligation is assessed ${b("compliant")}`, citations: [] },
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
