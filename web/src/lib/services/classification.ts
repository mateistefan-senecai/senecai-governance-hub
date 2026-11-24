// Step 2 (classification) and step 3 (obligation mapping) as one continuous
// step: every change to the effective classification regenerates the
// system's obligations from the content library.

import type { Tx } from "@/lib/tenant";
import type { AiSystem, Classification, Prisma } from "@/generated/prisma/client";
import { applicableObligations, evaluate, missingAnswers, pruneAnswers, test } from "@/lib/content/engine";
import { missingFacts, systemAnswers } from "@/lib/content/facts";
import type { Answers, ContentBundle, Firing, Outputs } from "@/lib/content/types";
import { audit, type Actor } from "./audit";
import { refreshDocuments } from "@/lib/documents/freshness";
import { notifyClient } from "./notifications";
import { RISK_LABEL, roleList } from "@/lib/labels";

export const RISK_CLASSES = ["PROHIBITED", "HIGH_RISK", "LIMITED", "MINIMAL", "OUT_OF_SCOPE"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];
export const PARTIES = ["provider", "deployer", "importer", "distributor"] as const;

export class ValidationError extends Error {}

export async function submitClassification(
  tx: Tx,
  actor: Actor,
  system: AiSystem,
  rawAnswers: Answers,
  bundle: ContentBundle,
): Promise<Classification> {
  // The system record answers the "facts" questions; it overrides anything submitted for them.
  if (missingFacts(bundle.classification, system).length) {
    throw new ValidationError("Complete the AI system record first (areas of use, who is affected, what it does).");
  }
  const answers = pruneAnswers(bundle.classification, { ...rawAnswers, ...systemAnswers(bundle.classification, system) });
  const missing = missingAnswers(bundle.classification, answers);
  if (missing.length) throw new ValidationError(`Answer every question first (${missing.length} left).`);

  const { outputs, reasoning } = evaluate(bundle.classification, answers);
  const previous = await tx.classification.findFirst({ where: { systemId: system.id, isCurrent: true } });
  await tx.classification.updateMany({ where: { systemId: system.id, isCurrent: true }, data: { isCurrent: false } });

  const created = await tx.classification.create({
    data: {
      organizationId: system.organizationId,
      systemId: system.id,
      version: (previous?.version ?? 0) + 1,
      contentVersion: bundle.version,
      answers,
      computed: outputs as Prisma.InputJsonObject,
      reasoning: reasoning as Prisma.InputJsonArray,
      effective: outputs as Prisma.InputJsonObject,
      createdById: actor.userId,
    },
  });
  await tx.aiSystem.update({ where: { id: system.id }, data: { classificationStale: false } });
  await audit(tx, actor, {
    entityType: "Classification",
    entityId: created.id,
    action: "classification.submitted",
    before: previous ? { version: previous.version, effective: previous.effective } : undefined,
    after: { version: created.version, riskClass: outputs.riskClass, roles: outputs.roles, contentVersion: bundle.version },
  });
  await syncObligations(tx, system, outputs, bundle);
  await syncCompanyObligations(tx, system.organizationId, system.clientId, bundle);
  await syncVendorDocuments(tx, system, outputs, bundle);
  await refreshDocuments(tx, actor, system.clientId, "classification submitted");
  return created;
}

export async function confirmClassification(tx: Tx, actor: Actor, classification: Classification) {
  const updated = await tx.classification.update({
    where: { id: classification.id },
    data: { status: "CONFIRMED", reviewedById: actor.userId, reviewedAt: new Date() },
  });
  await audit(tx, actor, {
    entityType: "Classification",
    entityId: classification.id,
    action: "classification.confirmed",
    after: { effective: classification.effective },
  });
  const system = await tx.aiSystem.findUniqueOrThrow({ where: { id: classification.systemId } });
  const e = classification.effective as Outputs;
  await notifyClient(tx, {
    organizationId: system.organizationId,
    clientId: system.clientId,
    kind: "CLASSIFICATION_CONFIRMED",
    title: `Classification confirmed: ${system.name}`,
    body: `${RISK_LABEL[String(e.riskClass)] ?? e.riskClass}${(e.roles as string[] | undefined)?.length ? ` · ${roleList(e.roles as string[])}` : ""}. Confirmed by ${actor.userName}.`,
    link: `/clients/${system.clientId}/systems/${system.id}`,
  });
  await refreshDocuments(tx, actor, system.clientId, "classification confirmed");
  return updated;
}

export type Override = { riskClass: RiskClass; roles: string[]; highRiskBasis: string[]; reason: string };

/** A reviewer replaces the computed result. The reason is mandatory and kept. */
export async function overrideClassification(
  tx: Tx,
  actor: Actor,
  system: AiSystem,
  classification: Classification,
  override: Override,
  bundle: ContentBundle,
) {
  if (override.reason.trim().length < 20) {
    throw new ValidationError("Explain the override in at least a sentence (20 characters or more).");
  }
  if (!RISK_CLASSES.includes(override.riskClass)) throw new ValidationError("Choose a risk class.");
  if (override.riskClass !== "OUT_OF_SCOPE" && !override.roles.length) throw new ValidationError("Choose at least one role.");

  const effective = applyOverride(classification.computed as Outputs, override);
  const updated = await tx.classification.update({
    where: { id: classification.id },
    data: {
      status: "OVERRIDDEN",
      effective: effective as Prisma.InputJsonObject,
      overrideReason: override.reason.trim(),
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    },
  });
  await audit(tx, actor, {
    entityType: "Classification",
    entityId: classification.id,
    action: "classification.overridden",
    before: { effective: classification.effective },
    after: { effective, reason: override.reason.trim() },
  });
  await syncObligations(tx, system, effective, bundle);
  await syncCompanyObligations(tx, system.organizationId, system.clientId, bundle);
  await syncVendorDocuments(tx, system, effective, bundle);
  await notifyClient(tx, {
    organizationId: system.organizationId,
    clientId: system.clientId,
    kind: "CLASSIFICATION_OVERRIDDEN",
    title: `Classification set by your reviewer: ${system.name}`,
    body: `${RISK_LABEL[override.riskClass] ?? override.riskClass}${override.roles.length ? ` · ${roleList(override.roles)}` : ""}. Reason given by ${actor.userName}: ${override.reason.trim()}`,
    link: `/clients/${system.clientId}/systems/${system.id}`,
  });
  await refreshDocuments(tx, actor, system.clientId, "classification overridden");
  return updated;
}

export function applyOverride(computed: Outputs, o: Override): Outputs {
  const highRisk = o.riskClass === "HIGH_RISK";
  const computedBasis = Array.isArray(computed.highRiskBasis) ? (computed.highRiskBasis as string[]) : [];
  return {
    ...computed,
    roles: o.riskClass === "OUT_OF_SCOPE" ? [] : o.roles,
    riskClass: o.riskClass,
    outOfScope: o.riskClass === "OUT_OF_SCOPE",
    prohibited: o.riskClass === "PROHIBITED",
    highRisk,
    highRiskBasis: highRisk ? (o.highRiskBasis.length ? o.highRiskBasis : computedBasis.length ? computedBasis : ["annexIII"]) : [],
    art6_3Exempt: highRisk ? false : computed.art6_3Exempt ?? false,
  };
}

/**
 * Makes the system's obligations match its effective classification.
 * Obligations that still apply keep their assessment; if the reason they
 * apply changed, the assessment is flagged for review. Obligations that no
 * longer apply are deactivated, not deleted, so their history stays.
 */
export async function syncObligations(tx: Tx, system: AiSystem, effective: Outputs, bundle: ContentBundle) {
  const applicable = applicableObligations(bundle, effective).filter((a) => a.def.level !== "company");
  const existing = await tx.systemObligation.findMany({ where: { systemId: system.id } });
  const byKey = new Map(existing.map((o) => [o.obligationKey, o]));

  for (const a of applicable) {
    const prev = byKey.get(a.def.key);
    const appliesFrom = a.appliesFrom ? new Date(a.appliesFrom) : null;
    const data = {
      contentVersion: bundle.version,
      party: a.party,
      appliesFrom,
      rationale: a.def.appliesBecause,
      active: true,
    };
    if (!prev) {
      await tx.systemObligation.create({
        data: { ...data, organizationId: system.organizationId, clientId: system.clientId, systemId: system.id, obligationKey: a.def.key },
      });
      continue;
    }
    const changed =
      !prev.active || prev.party !== a.party || prev.appliesFrom?.getTime() !== appliesFrom?.getTime();
    await tx.systemObligation.update({
      where: { id: prev.id },
      data: { ...data, needsReassessment: prev.needsReassessment || (changed && prev.status !== "NOT_ASSESSED") },
    });
  }

  const stillApplies = new Set(applicable.map((a) => a.def.key));
  await tx.systemObligation.updateMany({
    where: { systemId: system.id, obligationKey: { notIn: [...stillApplies] }, active: true },
    data: { active: false },
  });
}

/** Bought and embedded systems get the vendor documents their classification calls for. */
export async function syncVendorDocuments(tx: Tx, system: AiSystem, effective: Outputs, bundle: ContentBundle) {
  if (system.origin === "BUILT") return;
  for (const doc of bundle.vendorDocuments) {
    if (doc.when && !test(doc.when, {}, effective)) continue;
    await tx.vendorDocument.upsert({
      where: { systemId_kind: { systemId: system.id, kind: doc.kind } },
      create: { organizationId: system.organizationId, systemId: system.id, kind: doc.kind },
      update: {},
    });
  }
}

export type ClassificationView = {
  riskClass: RiskClass;
  roles: string[];
  /** Art. 5 provisions the risk screen flagged; empty when nothing was flagged. */
  prohibitedPractices: string[];
  reasoning: Firing[];
  attention: string[];
};

export function viewOf(c: Pick<Classification, "effective" | "reasoning">): ClassificationView {
  const e = c.effective as Outputs;
  return {
    riskClass: e.riskClass as RiskClass,
    roles: (e.roles as string[]) ?? [],
    prohibitedPractices: (e.prohibitedPractices as string[]) ?? [],
    reasoning: (c.reasoning as Firing[]) ?? [],
    attention: (e.attention as string[]) ?? [],
  };
}

/**
 * Company-level obligations (content `level: "company"`, e.g. AI literacy):
 * one record per client, active while the current classification of at
 * least one of its systems selects it. The party is every role that
 * carries it across those systems; the date is the earliest.
 */
export async function syncCompanyObligations(tx: Tx, organizationId: string, clientId: string, bundle: ContentBundle) {
  const company = bundle.obligations.filter((d) => d.level === "company");
  if (!company.length) return;
  const current = await tx.classification.findMany({
    where: { isCurrent: true, system: { clientId } },
    select: { effective: true },
  });
  const selected = new Map<string, { parties: Set<string>; appliesFrom: string | null }>();
  for (const c of current) {
    for (const a of applicableObligations(bundle, c.effective as Outputs)) {
      if (a.def.level !== "company") continue;
      const entry = selected.get(a.def.key) ?? { parties: new Set<string>(), appliesFrom: a.appliesFrom };
      for (const p of a.party.split(" & ")) entry.parties.add(p);
      if (a.appliesFrom && (!entry.appliesFrom || a.appliesFrom < entry.appliesFrom)) entry.appliesFrom = a.appliesFrom;
      selected.set(a.def.key, entry);
    }
  }
  const existing = await tx.systemObligation.findMany({ where: { clientId, systemId: null } });
  for (const def of company) {
    const hit = selected.get(def.key);
    const prev = existing.find((o) => o.obligationKey === def.key);
    if (!hit) {
      if (prev?.active) await tx.systemObligation.update({ where: { id: prev.id }, data: { active: false } });
      continue;
    }
    const party = PARTIES.filter((p) => hit.parties.has(p)).join(" & ");
    const appliesFrom = hit.appliesFrom ? new Date(hit.appliesFrom) : null;
    const data = { contentVersion: bundle.version, party, appliesFrom, rationale: def.appliesBecause, active: true };
    if (!prev) {
      await tx.systemObligation.create({ data: { ...data, organizationId, clientId, systemId: null, obligationKey: def.key } });
    } else {
      const changed = !prev.active || prev.party !== party || prev.appliesFrom?.getTime() !== appliesFrom?.getTime();
      await tx.systemObligation.update({
        where: { id: prev.id },
        data: { ...data, needsReassessment: prev.needsReassessment || (changed && prev.status !== "NOT_ASSESSED") },
      });
    }
  }
}

/** The wording of the prohibited-practice screen's result, on screen and in the PDFs. */
export function prohibitedSummary(practices: string[]): string {
  return practices.length
    ? `Use that might trigger a prohibited practice: ${practices.join(", ")}`
    : "No potential use that might trigger a prohibited practice";
}
