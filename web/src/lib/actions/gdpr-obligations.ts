"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import { getApplicableGdprObligations } from "@/lib/gdpr-obligations";
import type { GdprObligationPlanItem } from "@/lib/gdpr-obligations/types";
import type { ObligationStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

function revalidateActivity(processingActivityId: string) {
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/obligations`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/gap`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/plan`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/dpia`);
  revalidatePath("/gdpr/inventory");
}

/**
 * TIED obligation mapping for one processing activity — lazily creates
 * NOT_STARTED rows for any currently-applicable obligation that doesn't
 * have one yet, mirroring getObligationPlan (AI Act module).
 */
export async function getGdprObligationPlan(processingActivityId: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const activity = await prisma.processingActivity.findFirst({
    where: { id: processingActivityId, organizationId: { in: orgIds } },
    include: { organization: { select: { name: true } } },
  });
  if (!activity) throw new Error("Processing activity not found or not accessible");

  const applicable = getApplicableGdprObligations(activity);

  if (applicable.length > 0) {
    const existing = await prisma.gdprObligationAssessment.findMany({
      where: { processingActivityId },
      select: { obligationId: true },
    });
    const existingIds = new Set(existing.map((e) => e.obligationId));
    const missing = applicable.filter((o) => !existingIds.has(o.id));
    if (missing.length > 0) {
      await prisma.gdprObligationAssessment.createMany({
        data: missing.map((o) => ({
          processingActivityId,
          obligationId: o.id,
          updatedById: session.user.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  const rows = await prisma.gdprObligationAssessment.findMany({ where: { processingActivityId } });
  const rowsById = new Map(rows.map((r) => [r.obligationId, r]));

  const items: GdprObligationPlanItem[] = applicable
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
    .filter((item): item is GdprObligationPlanItem => item !== null);

  return { activity, items };
}

const VALID_STATUSES: ObligationStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"];

/** Mirrors setObligationStatus (AI Act module) — writes just the status. */
export async function setGdprObligationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const processingActivityId = String(formData.get("processingActivityId"));
  const redirectTo = String(
    formData.get("redirectTo") ?? `/gdpr/compliance-plan/${processingActivityId}/obligations`,
  );
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const assessment = await prisma.gdprObligationAssessment.findFirst({
    where: { id, processingActivity: { organizationId: { in: orgIds } } },
  });
  if (!assessment) throw new Error("Not authorized for this obligation");

  const statusInput = String(formData.get("status"));
  if (!VALID_STATUSES.includes(statusInput as ObligationStatus)) {
    throw new Error(`Invalid status "${statusInput}"`);
  }

  await prisma.gdprObligationAssessment.update({
    where: { id },
    data: { status: statusInput as ObligationStatus, reviewedByConsultant: false, updatedById: session.user.id },
  });

  revalidateActivity(processingActivityId);
  redirect(`${redirectTo}?notice=${encodeURIComponent("Status updated.")}`);
}
