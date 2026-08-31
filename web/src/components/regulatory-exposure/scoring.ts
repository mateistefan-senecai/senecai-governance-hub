// scoring.ts
// Turns raw answers into a triage-level exposure result per regulation.
//
// This is deliberately conservative: it is a client-onboarding TRIAGE, not a
// legal scoping opinion. Where a rule is genuinely ambiguous from a
// questionnaire alone (e.g., NIS2 sub-threshold exceptions, DORA critical-ICT-
// provider designation, CRA class assignment), the engine returns "monitor"
// rather than guessing "high" or "not_applicable", and the reason string says
// so explicitly. Wire the "high"/"monitor" outcomes to a human review step
// before anything gets presented to the client as a determination.
//
// The regulation identity and legal citations live entirely here and in the
// results screen — never in the question copy itself (see questions.ts).

import { Answers, ExposureLevel, RegulationResult } from "./types";

function toArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function level(reasonsHigh: string[], reasonsMonitor: string[], reasonsLow: string[]): {
  level: ExposureLevel;
  score: number;
} {
  if (reasonsHigh.length > 0) return { level: "high", score: 85 };
  if (reasonsMonitor.length > 0) return { level: "monitor", score: 50 };
  if (reasonsLow.length > 0) return { level: "low", score: 20 };
  return { level: "not_applicable", score: 0 };
}

// ---------------------------------------------------------------------------
// AI Act — driven by ai.* and org.publicSector
// ---------------------------------------------------------------------------
export function scoreAIAct(a: Answers): RegulationResult {
  const role = toArray(a["ai.role"]);
  const high: string[] = [];
  const monitor: string[] = [];
  const low: string[] = [];

  if (role.includes("none") || role.length === 0) {
    return {
      regulation: "aiAct",
      label: "EU AI Act",
      ...level([], [], []),
      reasons: ["No AI systems built or used — out of scope as things stand."],
    };
  }

  const redFlags = toArray(a["ai.redFlags"]).filter((v) => v !== "none");
  if (redFlags.length > 0) {
    high.push(
      "Flags at least one practice that falls under the AI Act's prohibited-practices list (Art. 5) — this needs immediate legal review, independent of any other AI Act obligation."
    );
  }

  const useCases = toArray(a["ai.useCases"]).filter((v) => v !== "none");
  if (useCases.length > 0) {
    high.push(
      `Touches on ${useCases.length} Annex III high-risk use-case area(s) — full high-risk obligations apply, with the Annex III compliance deadline now 2 December 2027 following the Digital Omnibus deferral.`
    );
  }

  if (a["ai.embeddedInProduct"] === true) {
    high.push(
      "AI is a safety component in a regulated product (Annex I route) — high-risk obligations apply, phased in through 2 August 2028."
    );
  }

  const gpaiStatus = a["ai.gpaiStatus"];
  if (gpaiStatus === "frontier") {
    high.push(
      "General-purpose model at large/frontier training scale — presumed systemic risk (roughly the ~10²⁵ FLOPs threshold), triggering adversarial testing, incident reporting and Commission notification (Art. 55), in force since August 2025."
    );
  } else if (gpaiStatus === "unsureScale") {
    monitor.push(
      "Provides a general-purpose AI model but its scale relative to the systemic-risk threshold is unconfirmed — needs a compute estimate to close out."
    );
  } else if (gpaiStatus === "modest") {
    monitor.push(
      "Provides a general-purpose AI model below the systemic-risk threshold — baseline GPAI obligations (documentation, copyright policy, training-data summary) still apply and have been in force since August 2025."
    );
  }

  if (a["ai.publicFacingContent"] === true && high.length === 0) {
    monitor.push(
      "Interacts directly with people or generates/manipulates synthetic content — Article 50 transparency labelling obligations apply from 2 August 2026."
    );
  }

  if (high.length === 0 && monitor.length === 0) {
    low.push("Builds or uses AI, but no high-risk use case, prohibited practice, or general-purpose-model flag surfaced — revisit if the AI's role or use case changes.");
  }

  return {
    regulation: "aiAct",
    label: "EU AI Act",
    ...level(high, monitor, low),
    reasons: [...high, ...monitor, ...low],
    timing: "Prohibited practices & AI literacy: in force since Feb 2025. GPAI obligations: in force since Aug 2025. Art. 50 transparency: from 2 Aug 2026. Annex III high-risk: 2 Dec 2027. Annex I high-risk: 2 Aug 2028.",
  };
}

// ---------------------------------------------------------------------------
// GDPR — driven by data.* and org.euNexus / org.publicSector
// ---------------------------------------------------------------------------
export function scoreGDPR(a: Answers): RegulationResult {
  const high: string[] = [];
  const monitor: string[] = [];
  const low: string[] = [];

  if (a["data.processesPersonalData"] !== true) {
    const euNexus = toArray(a["org.euNexus"]);
    if (euNexus.includes("offersToEU") || euNexus.includes("monitorsEU")) {
      monitor.push(
        "No personal data processing flagged yet, but the organization offers services to or monitors people in the EU — GDPR's extraterritorial scope (Art. 3) likely applies once any personal data is involved."
      );
    }
    return {
      regulation: "gdpr",
      label: "GDPR",
      ...level([], monitor, []),
      reasons: monitor.length ? monitor : ["No personal data processing identified — out of scope as things stand."],
    };
  }

  const flags = toArray(a["data.flags"]).filter((v) => v !== "none");
  if (flags.includes("specialCategory")) {
    high.push("Processes special category data — heightened Art. 9 conditions apply, and a DPIA is likely required.");
  }
  if (flags.includes("largeScaleMonitoring")) {
    high.push("Large-scale systematic monitoring of individuals — a DPIA is likely required and a DPO may be mandatory.");
  }
  if (a["data.role"] === "processor" || a["data.role"] === "both") {
    monitor.push("Acts as a processor (in whole or in part) — Art. 28 processing agreements and sub-processor obligations apply.");
  }
  if (flags.includes("crossBorderTransfers")) {
    monitor.push("Personal data leaves the EU/EEA — transfer mechanisms (SCCs, TIA) need to be in place for non-adequacy destinations.");
  }
  const euNexus = toArray(a["org.euNexus"]);
  if (euNexus.includes("offersToEU") || euNexus.includes("monitorsEU")) {
    monitor.push("Non-EU established but offers services to, or monitors, people in the EU — GDPR applies extraterritorially under Art. 3(2).");
  }
  if (a["org.publicSector"] === true) {
    monitor.push("Public authority — a Data Protection Officer is mandatory regardless of scale.");
  }

  if (high.length === 0 && monitor.length === 0) {
    low.push("Processes personal data but none of the heightened triggers (special category data, large-scale monitoring, processor role, transfers) were flagged.");
  }

  return {
    regulation: "gdpr",
    label: "GDPR",
    ...level(high, monitor, low),
    reasons: [...high, ...monitor, ...low],
    timing: "In force since 25 May 2018 — no phase-in.",
  };
}

// ---------------------------------------------------------------------------
// NIS2 — driven by org.sector / org.employees / org.turnover / ops.*
// ---------------------------------------------------------------------------
export function scoreNIS2(a: Answers): RegulationResult {
  const high: string[] = [];
  const monitor: string[] = [];
  const low: string[] = [];

  if (a["ops.criticalRegardlessOfSize"] === true) {
    high.push("Falls into a category that is in scope regardless of size (sole critical-service provider, DNS/TLD/trust-service provider, or public electronic communications provider).");
  }

  const sector = a["org.sector"];
  const employees = a["org.employees"];
  const turnover = a["org.turnover"];
  const isMediumPlus = employees === "50-249" || employees === "250+" || turnover === "10-50m" || turnover === "50m+";
  const isLarge = employees === "250+" || turnover === "50m+";

  if (sector === "annexI") {
    if (isLarge) {
      high.push("Falls in a high-criticality sector at large-enterprise size (250+ staff or >€50M turnover) — in scope as an essential entity.");
    } else if (isMediumPlus) {
      high.push("Falls in a high-criticality sector at medium-enterprise size (50-249 staff or €10-50M turnover) — in scope as an important entity.");
    } else {
      monitor.push("Falls in a high-criticality sector but below the medium-enterprise threshold — generally out of scope unless a sub-threshold exception applies.");
    }
  } else if (sector === "annexII") {
    if (isMediumPlus) {
      high.push("Falls in an \"other critical\" sector at medium-enterprise size or above — in scope as an important entity.");
    } else {
      monitor.push("Falls in an \"other critical\" sector but below the medium-enterprise threshold — generally out of scope unless a sub-threshold exception applies.");
    }
  }

  if (a["org.partOfGroup"] === true && (high.length > 0 || monitor.length > 0)) {
    monitor.push("Part of a corporate group — size thresholds are typically assessed at group (linked/partner enterprise) level, which can change the outcome above.");
  }

  if (high.length === 0 && monitor.length === 0) {
    low.push("Sector and size combination doesn't match a covered threshold as answered — worth re-checking if either changes.");
  }

  return {
    regulation: "nis2",
    label: "NIS2",
    ...level(high, monitor, low),
    reasons: [...high, ...monitor, ...low],
    timing: "National transposition deadline passed 17 Oct 2024 — obligations are live in most Member States now, subject to each country's implementing law.",
  };
}

// ---------------------------------------------------------------------------
// DORA — driven by fin.*
// ---------------------------------------------------------------------------
export function scoreDORA(a: Answers): RegulationResult {
  const high: string[] = [];
  const monitor: string[] = [];
  const low: string[] = [];

  const entityTypes = toArray(a["fin.isFinancialEntity"]).filter((v) => v !== "none");
  if (entityTypes.length > 0) {
    high.push(
      "Falls into one of DORA's ~20-21 regulated financial-entity categories — full ICT risk management, incident reporting, resilience testing and third-party oversight obligations apply (in force since 17 Jan 2025). Proportionality can simplify the framework for smaller entities, but doesn't exempt them."
    );
  }

  const ictScale = a["fin.ictProviderScale"];
  if (ictScale === "manyClients") {
    monitor.push(
      "ICT provider to many EU financial institutions — Article 30 contractual flow-down terms apply now, and there's a realistic chance of designation as a Critical ICT Third-Party Provider (CTPP) under direct ESA oversight."
    );
  } else if (ictScale === "fewClients" || ictScale === "unsureScale") {
    monitor.push(
      "ICT provider to EU financial entities — even without a CTPP designation, contracts need to carry DORA Article 30 mandatory terms (SLAs, audit/access rights, exit provisions) because clients are required to impose them."
    );
  }

  if (high.length === 0 && monitor.length === 0) {
    low.push("Neither a regulated financial entity nor an ICT provider to one, as answered.");
  }

  return {
    regulation: "dora",
    label: "DORA",
    ...level(high, monitor, low),
    reasons: [...high, ...monitor, ...low],
    timing: "Fully applicable since 17 January 2025 — directly applicable EU regulation, no further transposition needed.",
  };
}

// ---------------------------------------------------------------------------
// Cyber Resilience Act — driven by product.*
// ---------------------------------------------------------------------------
export function scoreCRA(a: Answers): RegulationResult {
  const high: string[] = [];
  const monitor: string[] = [];
  const low: string[] = [];

  if (a["product.placesOnEUMarket"] !== true) {
    return {
      regulation: "cra",
      label: "Cyber Resilience Act",
      ...level([], [], []),
      reasons: ["No product with digital elements placed on the EU market, as answered."],
    };
  }

  const profile = a["product.profile"];
  if (profile === "sectorRegulated") {
    low.push("Already covered by a sector-specific regime (medical devices, motor vehicles, or civil aviation) — generally excluded from CRA's general regime, but confirm the specific carve-out applies to the whole product.");
  } else if (profile === "pureSaaS") {
    monitor.push("Described as pure SaaS with no downloadable component or connected hardware — likely outside CRA scope, but remote data-processing tied to a covered product can still count as part of that product, so this needs a one-line confirmation rather than an assumption.");
  } else if (profile === "criticalClass") {
    high.push("Core function matches a Critical / Important Class II category — mandatory third-party conformity assessment via a notified body, plus a European cybersecurity certification scheme where required.");
  } else if (profile === "importantClass") {
    high.push("Core function matches an Important Class I category — self-assessment is only available if harmonised standards are applied; otherwise third-party assessment is required.");
  } else if (profile === "unsure") {
    monitor.push("Places a connected product on the EU market but its Annex III/IV classification is unconfirmed — needs a proper core-function classification against Commission Implementing Regulation (EU) 2025/2392.");
  } else {
    monitor.push("Places a connected product on the EU market in the default category — self-assessed CE marking still applies, plus the essential cybersecurity and vulnerability-handling requirements.");
  }

  return {
    regulation: "cra",
    label: "Cyber Resilience Act",
    ...level(high, monitor, low),
    reasons: [...high, ...monitor, ...low],
    timing: "Reporting obligations (actively exploited vulnerabilities, severe incidents) from 11 Sept 2026. Full essential requirements and CE marking from 11 Dec 2027.",
  };
}

export function scoreAll(a: Answers): RegulationResult[] {
  return [scoreAIAct(a), scoreGDPR(a), scoreNIS2(a), scoreDORA(a), scoreCRA(a)];
}
