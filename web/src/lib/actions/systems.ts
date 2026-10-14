"use server";

import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { assertReviewer, requireClient, requireSystem } from "@/lib/authz";
import { getCurrentContent, getContentVersion } from "@/lib/content/current";
import { audit } from "@/lib/services/audit";
import {
  ValidationError,
  confirmClassification,
  overrideClassification,
  submitClassification,
  type RiskClass,
} from "@/lib/services/classification";
import { createSystem, updateSystem, type SystemInput } from "@/lib/services/inventory";
import { assessObligation } from "@/lib/services/assessment";
import type { Autonomy, ObligationStatus, Stage, SystemOrigin, UseType, VendorDocStatus } from "@/generated/prisma/enums";
import { actor, parseAnswers, run, str, strOrNull } from "./run";

function systemInput(form: FormData): SystemInput {
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T => {
    const v = str(form, key) as T;
    if (!allowed.includes(v)) throw new ValidationError(`Choose a value for "${key}".`);
    return v;
  };
  return {
    name: str(form, "name"),
    purpose: str(form, "purpose"),
    description: strOrNull(form, "description"),
    ownerName: str(form, "ownerName"),
    ownerRole: strOrNull(form, "ownerRole"),
    origin: oneOf<SystemOrigin>("origin", ["BUILT", "BOUGHT", "EMBEDDED"]),
    supplier: strOrNull(form, "supplier"),
    dataCategories: str(form, "dataCategories")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    deploymentContext: str(form, "deploymentContext"),
    useType: oneOf<UseType>("useType", ["PRODUCT", "INTERNAL", "HYBRID"]),
    autonomy: oneOf<Autonomy>("autonomy", ["ADVISORY", "PARTIAL", "FULL"]),
    stage: oneOf<Stage>("stage", ["PLANNED", "PILOT", "PRODUCTION", "RETIRED"]),
    affectedPersons: strOrNull(form, "affectedPersons"),
  };
}

export async function createSystemAction(clientId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/new`, async () => {
    const input = systemInput(form);
    const system = await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      return createSystem(tx, actor(ctx), client, input);
    });
    return { to: `/clients/${clientId}/systems/${system.id}/classify`, notice: `${system.name} added. Next, classify it.` };
  });
}

export async function updateSystemAction(clientId: string, systemId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}/edit`, async () => {
    const input = systemInput(form);
    const updated = await withTenant(ctx, async (tx) => {
      const { system } = await requireSystem(tx, ctx, clientId, systemId);
      return updateSystem(tx, actor(ctx), system, input);
    });
    return {
      to: `/clients/${clientId}/systems/${systemId}`,
      notice: updated.classificationStale ? "Saved. The change reopens the classification." : "Saved.",
    };
  });
}

export async function submitClassificationAction(clientId: string, systemId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}/classify`, async () => {
    const answers = parseAnswers(form);
    await withTenant(ctx, async (tx) => {
      const { system } = await requireSystem(tx, ctx, clientId, systemId);
      await submitClassification(tx, actor(ctx), system, answers, await getCurrentContent(tx));
    });
    return { to: `/clients/${clientId}/systems/${systemId}`, notice: "Classification saved. Obligations updated." };
  });
}

export async function confirmClassificationAction(clientId: string, systemId: string) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}`, async () => {
    assertReviewer(ctx);
    await withTenant(ctx, async (tx) => {
      await requireSystem(tx, ctx, clientId, systemId);
      const current = await tx.classification.findFirstOrThrow({ where: { systemId, isCurrent: true } });
      if (current.status !== "PRELIMINARY") throw new ValidationError("This classification has already been reviewed.");
      await confirmClassification(tx, actor(ctx), current);
    });
    return { notice: "Classification confirmed." };
  });
}

export async function overrideClassificationAction(clientId: string, systemId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}`, async () => {
    assertReviewer(ctx);
    await withTenant(ctx, async (tx) => {
      const { system } = await requireSystem(tx, ctx, clientId, systemId);
      const current = await tx.classification.findFirstOrThrow({ where: { systemId, isCurrent: true } });
      // Rules and obligations of the version the classification was built on.
      const bundle = await getContentVersion(tx, current.contentVersion);
      await overrideClassification(
        tx,
        actor(ctx),
        system,
        current,
        {
          riskClass: str(form, "riskClass") as RiskClass,
          roles: form.getAll("roles").filter((r): r is string => typeof r === "string"),
          highRiskBasis: form.getAll("highRiskBasis").filter((r): r is string => typeof r === "string"),
          reason: str(form, "reason"),
        },
        bundle,
      );
    });
    return { notice: "Override recorded. Obligations updated." };
  });
}

export async function setVendorDocumentStatus(clientId: string, systemId: string, docId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}`, async () => {
    const status = str(form, "status") as VendorDocStatus;
    if (!["TO_REQUEST", "REQUESTED", "RECEIVED", "NOT_AVAILABLE"].includes(status)) throw new ValidationError("Choose a status.");
    await withTenant(ctx, async (tx) => {
      await requireSystem(tx, ctx, clientId, systemId);
      const doc = await tx.vendorDocument.findFirstOrThrow({ where: { id: docId, systemId } });
      await tx.vendorDocument.update({ where: { id: doc.id }, data: { status } });
      await audit(tx, actor(ctx), {
        entityType: "VendorDocument",
        entityId: doc.id,
        action: "vendorDocument.status",
        before: { status: doc.status },
        after: { status },
      });
    });
  });
}

export async function assessObligationAction(clientId: string, systemId: string, obligationId: string, form: FormData) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/systems/${systemId}/obligations/${obligationId}`;
  await run(back, async () => {
    assertReviewer(ctx);
    await withTenant(ctx, async (tx) => {
      await requireSystem(tx, ctx, clientId, systemId);
      const so = await tx.systemObligation.findFirstOrThrow({
        where: { id: obligationId, systemId },
        include: { system: { select: { clientId: true } } },
      });
      const bundle = await getContentVersion(tx, so.contentVersion);
      await assessObligation(tx, actor(ctx), so, str(form, "status") as ObligationStatus, str(form, "rationale"), bundle);
    });
    return { notice: "Assessment saved." };
  });
}

export async function setObligationOwner(clientId: string, systemId: string, obligationId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/systems/${systemId}/obligations/${obligationId}`, async () => {
    const ownerName = strOrNull(form, "ownerName");
    await withTenant(ctx, async (tx) => {
      await requireSystem(tx, ctx, clientId, systemId);
      const so = await tx.systemObligation.findFirstOrThrow({ where: { id: obligationId, systemId } });
      await tx.systemObligation.update({ where: { id: so.id }, data: { ownerName } });
      await tx.action.updateMany({ where: { systemObligationId: so.id, ownerName: so.ownerName }, data: { ownerName } });
      await audit(tx, actor(ctx), {
        entityType: "SystemObligation",
        entityId: so.id,
        action: "obligation.owner",
        before: { ownerName: so.ownerName },
        after: { ownerName },
      });
    });
    return { notice: "Owner saved." };
  });
}
