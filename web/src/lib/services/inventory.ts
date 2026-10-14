// Step 1: the AI inventory, a living register. Changing what a system is,
// who supplies it, what it is for or where it runs reopens its
// classification and flags its assessed obligations for review (spec §4).

import type { Tx } from "@/lib/tenant";
import type { AiSystem, Autonomy, Client, Prisma, Stage, SystemOrigin, UseType } from "@/generated/prisma/client";
import { evaluate, pruneAnswers } from "@/lib/content/engine";
import type { Answers, ContentBundle } from "@/lib/content/types";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";

export type SystemInput = {
  name: string;
  purpose: string;
  description: string | null;
  ownerName: string;
  ownerRole: string | null;
  origin: SystemOrigin;
  supplier: string | null;
  dataCategories: string[];
  deploymentContext: string;
  useType: UseType;
  autonomy: Autonomy;
  stage: Stage;
  affectedPersons: string | null;
};

/** Edits to these fields change what the system legally is. */
const RECLASSIFY_FIELDS = ["purpose", "origin", "supplier", "deploymentContext", "useType", "autonomy", "affectedPersons"] as const;

export function assertSystemInput(input: SystemInput) {
  if (!input.name) throw new ValidationError("Give the system a name.");
  if (!input.purpose) throw new ValidationError("Describe the system's purpose.");
  if (!input.ownerName) throw new ValidationError("Name the accountable owner.");
  if (!input.deploymentContext) throw new ValidationError("Say where the system is deployed.");
  if (input.origin !== "BUILT" && !input.supplier) throw new ValidationError("Name the supplier of a bought or embedded system.");
}

export async function createSystem(tx: Tx, actor: Actor, client: Client, input: SystemInput) {
  assertSystemInput(input);
  if (!aiActApplies(client)) {
    throw new ValidationError("Complete the applicability check first: the inventory opens once the AI Act applies.");
  }
  const system = await tx.aiSystem.create({
    data: { ...input, organizationId: client.organizationId, clientId: client.id },
  });
  await audit(tx, actor, { entityType: "AiSystem", entityId: system.id, action: "system.created", after: input });
  return system;
}

export async function updateSystem(tx: Tx, actor: Actor, system: AiSystem, input: SystemInput) {
  assertSystemInput(input);
  const changed = RECLASSIFY_FIELDS.filter((f) => JSON.stringify(system[f]) !== JSON.stringify(input[f]));
  const hasClassification = (await tx.classification.count({ where: { systemId: system.id } })) > 0;
  const reopen = changed.length > 0 && hasClassification;

  const updated = await tx.aiSystem.update({
    where: { id: system.id },
    data: { ...input, classificationStale: system.classificationStale || reopen },
  });
  if (reopen) {
    await tx.systemObligation.updateMany({
      where: { systemId: system.id, active: true, status: { not: "NOT_ASSESSED" } },
      data: { needsReassessment: true },
    });
  }
  await audit(tx, actor, {
    entityType: "AiSystem",
    entityId: system.id,
    action: reopen ? "system.updated.reclassify" : "system.updated",
    before: pick(system, Object.keys(input) as (keyof SystemInput)[]),
    after: { ...input, reopenedBecause: reopen ? changed : undefined },
  });
  return updated;
}

function pick<T extends object, K extends keyof T>(o: T, keys: K[]) {
  return Object.fromEntries(keys.map((k) => [k, o[k]]));
}

// ── Applicability check ──────────────────────────────────────────────────

export type Finding = {
  regulation: string;
  name: string;
  applies: "yes" | "likely" | "no";
  provision: string;
  summary: string;
  coveredInThisVersion: boolean;
};

export function aiActApplies(client: Pick<Client, "applicability">): boolean {
  const findings = (client.applicability as { findings?: Finding[] } | null)?.findings ?? [];
  return findings.some((f) => f.regulation === "AI_ACT" && f.applies === "yes");
}

export async function runApplicability(tx: Tx, actor: Actor, client: Client, raw: Answers, bundle: ContentBundle) {
  const answers = pruneAnswers(bundle.applicability, raw);
  const { outputs, reasoning } = evaluate(bundle.applicability, answers);
  const applicability = { findings: outputs.findings, reasoning } as Prisma.InputJsonObject;
  const updated = await tx.client.update({
    where: { id: client.id },
    data: {
      profile: answers,
      applicability,
      applicabilityContentVersion: bundle.version,
      applicabilityAt: new Date(),
    },
  });
  await audit(tx, actor, {
    entityType: "Client",
    entityId: client.id,
    action: "applicability.run",
    before: client.applicability ?? undefined,
    after: applicability,
  });
  return updated;
}
