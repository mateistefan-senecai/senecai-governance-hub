"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds, isConsultantOrAbove } from "@/lib/authz";
import type { Answer } from "@/lib/decision-trees/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { AutonomyLevel, ImplementationStage, UseCaseType } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export async function listAiSystems() {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  return prisma.aiSystem.findMany({
    where: { organizationId: { in: orgIds } },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAccessibleOrganizations() {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  return prisma.organization.findMany({
    where: { id: { in: orgIds } },
    orderBy: { name: "asc" },
  });
}

export async function getAiSystem(id: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const system = await prisma.aiSystem.findFirst({
    where: { id, organizationId: { in: orgIds } },
    include: {
      organization: { select: { name: true } },
      decisionRuns: { orderBy: { runAt: "desc" } },
    },
  });
  if (!system) throw new Error("AI system not found or not accessible");
  return system;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v : "";
  if (!s.length) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function boolOrNull(v: FormDataEntryValue | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}
function enumOrNull<T extends string>(v: FormDataEntryValue | null): T | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? (s as T) : null;
}

export async function createAiSystem(formData: FormData) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const organizationId = String(formData.get("organizationId") ?? session.user.organizationId);
  if (!orgIds.includes(organizationId)) {
    throw new Error("Not authorized to create a system for this organization");
  }

  const name = emptyToNull(formData.get("name"));
  if (!name) throw new Error("System name is required");

  const system = await prisma.aiSystem.create({
    data: {
      organizationId,
      name,
      description: emptyToNull(formData.get("description")),
      useCaseType: enumOrNull<UseCaseType>(formData.get("useCaseType")),
      businessProcess: emptyToNull(formData.get("businessProcess")),
      inputData: emptyToNull(formData.get("inputData")),
      outputData: emptyToNull(formData.get("outputData")),
      dataSource: emptyToNull(formData.get("dataSource")),
      humanOversightMechanism: emptyToNull(formData.get("humanOversightMechanism")),
      autonomyLevel: enumOrNull<AutonomyLevel>(formData.get("autonomyLevel")),
      complianceOwnerName: emptyToNull(formData.get("complianceOwnerName")),
      complianceOwnerRole: emptyToNull(formData.get("complianceOwnerRole")),
      decisionsAndImpact: emptyToNull(formData.get("decisionsAndImpact")),
      userCount: numberOrNull(formData.get("userCount")),
      affectsEndCustomers: boolOrNull(formData.get("affectsEndCustomers")),
      endCustomerEstimate: emptyToNull(formData.get("endCustomerEstimate")),
      implementationStage: enumOrNull<ImplementationStage>(formData.get("implementationStage")),
      createdById: session.user.id,
    },
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${system.id}`);
}

export async function recordDecisionRun(input: {
  aiSystemId: string;
  treeId: string;
  treeVersion: number;
  answers: Answer[];
  resultField: "legalRole" | "riskClassification";
  resultValue: string;
}) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const system = await prisma.aiSystem.findFirst({
    where: { id: input.aiSystemId, organizationId: { in: orgIds } },
  });
  if (!system) throw new Error("Not authorized for this AI system");

  await prisma.decisionRun.create({
    data: {
      aiSystemId: input.aiSystemId,
      treeId: input.treeId,
      treeVersion: input.treeVersion,
      answers: input.answers as unknown as Prisma.InputJsonValue,
      resultField: input.resultField,
      resultValue: input.resultValue,
      resultTentative: true,
      runByUserId: session.user.id,
    },
  });

  if (input.resultField === "legalRole") {
    await prisma.aiSystem.update({
      where: { id: input.aiSystemId },
      data: {
        legalRole: input.resultValue as Prisma.AiSystemUpdateInput["legalRole"],
        legalRoleReviewedByConsultant: false,
      },
    });
  } else {
    await prisma.aiSystem.update({
      where: { id: input.aiSystemId },
      data: {
        riskClassification: input.resultValue as Prisma.AiSystemUpdateInput["riskClassification"],
        riskClassificationReviewedByConsultant: false,
      },
    });
  }

  revalidatePath(`/inventory/${input.aiSystemId}`);
}

export async function markReviewed(
  aiSystemId: string,
  field: "legalRole" | "riskClassification",
) {
  const session = await requireSession();
  if (!isConsultantOrAbove(session)) {
    throw new Error("Only SenecAI consultants can mark a classification as reviewed");
  }
  const orgIds = await getAccessibleOrgIds(session);
  const system = await prisma.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: { in: orgIds } },
  });
  if (!system) throw new Error("Not authorized for this AI system");

  await prisma.aiSystem.update({
    where: { id: aiSystemId },
    data:
      field === "legalRole"
        ? { legalRoleReviewedByConsultant: true }
        : { riskClassificationReviewedByConsultant: true },
  });

  revalidatePath(`/inventory/${aiSystemId}`);
}
