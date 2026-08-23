"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds, isConsultantOrAbove } from "@/lib/authz";
import { getApplicableObligations } from "@/lib/obligations";
import type { ObligationPlanItem } from "@/lib/obligations/types";
import type { ObligationStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateSystem(aiSystemId: string) {
  revalidatePath(`/compliance-plan/${aiSystemId}/obligations`);
  revalidatePath(`/compliance-plan/${aiSystemId}/gap`);
  revalidatePath(`/compliance-plan/${aiSystemId}/plan`);
  revalidatePath("/inventory");
}

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s.length) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Feature 2.1/2.2 — the obligation mapping for one system. Lazily creates
 * NOT_STARTED rows for any currently-applicable obligation that doesn't
 * have one yet, so the plan is always complete without a separate seeding
 * step, and always reflects the system's latest Module 1 classification.
 */
export async function getObligationPlan(aiSystemId: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const system = await prisma.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: { in: orgIds } },
    include: { organization: { select: { name: true } } },
  });
  if (!system) throw new Error("AI system not found or not accessible");

  const applicable = getApplicableObligations(system);

  if (applicable.length > 0) {
    const existing = await prisma.obligationAssessment.findMany({
      where: { aiSystemId },
      select: { obligationId: true },
    });
    const existingIds = new Set(existing.map((e) => e.obligationId));
    const missing = applicable.filter((o) => !existingIds.has(o.id));
    if (missing.length > 0) {
      await prisma.obligationAssessment.createMany({
        data: missing.map((o) => ({
          aiSystemId,
          obligationId: o.id,
          updatedById: session.user.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  const rows = await prisma.obligationAssessment.findMany({ where: { aiSystemId } });
  const rowsById = new Map(rows.map((r) => [r.obligationId, r]));

  const items: ObligationPlanItem[] = applicable
    .map((obligation) => {
      const row = rowsById.get(obligation.id);
      if (!row) return null;
      return {
        obligation,
        assessment: {
          id: row.id,
          status: row.status,
          ownerName: row.ownerName,
          dueDate: row.dueDate,
          note: row.note,
          reviewedByConsultant: row.reviewedByConsultant,
        },
      };
    })
    .filter((item): item is ObligationPlanItem => item !== null);

  return { system, items };
}

async function requireAssessmentAccess(id: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const assessment = await prisma.obligationAssessment.findFirst({
    where: { id, aiSystem: { organizationId: { in: orgIds } } },
  });
  if (!assessment) throw new Error("Not authorized for this obligation");
  return { session, assessment };
}

const VALID_STATUSES: ObligationStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "NOT_APPLICABLE",
];

export async function updateObligationAssessment(formData: FormData) {
  const id = String(formData.get("id"));
  const aiSystemId = String(formData.get("aiSystemId"));
  const { session, assessment } = await requireAssessmentAccess(id);

  const statusInput = String(formData.get("status"));
  const status = VALID_STATUSES.includes(statusInput as ObligationStatus)
    ? (statusInput as ObligationStatus)
    : assessment.status;

  await prisma.obligationAssessment.update({
    where: { id },
    data: {
      status,
      ownerName: emptyToNull(formData.get("ownerName")),
      dueDate: dateOrNull(formData.get("dueDate")),
      note: emptyToNull(formData.get("note")),
      reviewedByConsultant: false,
      updatedById: session.user.id,
    },
  });

  revalidateSystem(aiSystemId);
}

export async function markObligationReviewed(formData: FormData) {
  const id = String(formData.get("id"));
  const aiSystemId = String(formData.get("aiSystemId"));
  const { session } = await requireAssessmentAccess(id);
  if (!isConsultantOrAbove(session)) {
    throw new Error("Only SenecAI consultants can mark an obligation as reviewed");
  }

  await prisma.obligationAssessment.update({
    where: { id },
    data: { reviewedByConsultant: true, updatedById: session.user.id },
  });

  revalidateSystem(aiSystemId);
}

/**
 * The Gap assessment's Yes/Partially/No/N/A control and the Plan screen's
 * Not started/In progress/Done control both write just the status —
 * unlike updateObligationAssessment, this never touches ownerName/dueDate/note.
 */
export async function setObligationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const aiSystemId = String(formData.get("aiSystemId"));
  const redirectTo = String(formData.get("redirectTo") ?? `/compliance-plan/${aiSystemId}/obligations`);
  const { session } = await requireAssessmentAccess(id);

  const statusInput = String(formData.get("status"));
  if (!VALID_STATUSES.includes(statusInput as ObligationStatus)) {
    throw new Error(`Invalid status "${statusInput}"`);
  }

  await prisma.obligationAssessment.update({
    where: { id },
    data: { status: statusInput as ObligationStatus, reviewedByConsultant: false, updatedById: session.user.id },
  });

  revalidateSystem(aiSystemId);
  redirect(`${redirectTo}?notice=${encodeURIComponent("Status updated.")}`);
}
