"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GdprCharacteristic, GdprRole, ImplementationStage } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function enumOrNull<T extends string>(v: FormDataEntryValue | null): T | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? (s as T) : null;
}

const VALID_CHARACTERISTICS: GdprCharacteristic[] = [
  "SPECIAL_CATEGORY_DATA",
  "LARGE_SCALE",
  "SYSTEMATIC_MONITORING",
  "AUTOMATED_DECISION_MAKING",
  "CHILDRENS_DATA",
  "CROSS_BORDER_TRANSFER",
  "USES_PROCESSOR",
  "LEGITIMATE_INTEREST_BASIS",
  "DIRECT_MARKETING",
];

function validCharacteristics(values: FormDataEntryValue[]): GdprCharacteristic[] {
  return values
    .map((v) => String(v))
    .filter((v): v is GdprCharacteristic => (VALID_CHARACTERISTICS as string[]).includes(v));
}

export async function listProcessingActivities() {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  return prisma.processingActivity.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      organization: { select: { name: true } },
      obligationAssessments: { select: { obligationId: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProcessingActivity(id: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const activity = await prisma.processingActivity.findFirst({
    where: { id, organizationId: { in: orgIds } },
    include: {
      organization: { select: { name: true } },
      dpia: true,
    },
  });
  if (!activity) throw new Error("Processing activity not found or not accessible");
  return activity;
}

export async function createProcessingActivity(formData: FormData) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const organizationId = String(formData.get("organizationId") ?? session.user.organizationId);
  if (!orgIds.includes(organizationId)) {
    throw new Error("Not authorized to create a processing activity for this organization");
  }

  const name = emptyToNull(formData.get("name"));
  if (!name) throw new Error("Processing activity name is required");

  const activity = await prisma.processingActivity.create({
    data: {
      organizationId,
      name,
      description: emptyToNull(formData.get("description")),
      businessFunction: emptyToNull(formData.get("businessFunction")),
      dataSubjectCategories: emptyToNull(formData.get("dataSubjectCategories")),
      dataCategories: emptyToNull(formData.get("dataCategories")),
      purposeOfProcessing: emptyToNull(formData.get("purposeOfProcessing")),
      recipients: emptyToNull(formData.get("recipients")),
      retentionPeriod: emptyToNull(formData.get("retentionPeriod")),
      securityMeasures: emptyToNull(formData.get("securityMeasures")),
      complianceOwnerName: emptyToNull(formData.get("complianceOwnerName")),
      complianceOwnerRole: emptyToNull(formData.get("complianceOwnerRole")),
      implementationStage: enumOrNull<ImplementationStage>(formData.get("implementationStage")),
      createdById: session.user.id,
    },
  });

  revalidatePath("/gdpr/inventory");
  redirect(`/gdpr/inventory/${activity.id}`);
}

/**
 * Role + characteristics are a direct self-report select, not a
 * decision-tree output (GDPR spec Section 2) — one plain update, no
 * "reviewedByConsultant" flag, unlike the AI Act module's classification.
 */
export async function updateProcessingActivityClassification(formData: FormData) {
  const id = String(formData.get("id"));
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const activity = await prisma.processingActivity.findFirst({
    where: { id, organizationId: { in: orgIds } },
  });
  if (!activity) throw new Error("Not authorized for this processing activity");

  await prisma.processingActivity.update({
    where: { id },
    data: {
      role: enumOrNull<GdprRole>(formData.get("role")),
      characteristics: validCharacteristics(formData.getAll("characteristics")),
    },
  });

  revalidatePath(`/gdpr/inventory/${id}`);
  revalidatePath("/gdpr/inventory");
  revalidatePath("/overview");
}
