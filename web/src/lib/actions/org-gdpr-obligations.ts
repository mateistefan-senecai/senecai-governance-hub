"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import { getGeneralGdprObligations } from "@/lib/gdpr-obligations";
import type { GdprObligationPlanItem } from "@/lib/gdpr-obligations/types";
import type { ObligationStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

/**
 * GENERAL GDPR obligations (ROPA, security, breach response, DSR
 * procedure, DPO assessment, ...) tracked once per organization — mirrors
 * getOrgObligationPlan (AI Act module), lazily creating NOT_STARTED rows.
 */
export async function getOrgGdprObligationPlan(organizationId: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  const general = getGeneralGdprObligations();

  const existing = await prisma.organizationGdprObligationAssessment.findMany({
    where: { organizationId },
    select: { obligationId: true },
  });
  const existingIds = new Set(existing.map((e) => e.obligationId));
  const missing = general.filter((o) => !existingIds.has(o.id));
  if (missing.length > 0) {
    await prisma.organizationGdprObligationAssessment.createMany({
      data: missing.map((o) => ({
        organizationId,
        obligationId: o.id,
        updatedById: session.user.id,
      })),
      skipDuplicates: true,
    });
  }

  const rows = await prisma.organizationGdprObligationAssessment.findMany({ where: { organizationId } });
  const rowsById = new Map(rows.map((r) => [r.obligationId, r]));

  const items: GdprObligationPlanItem[] = general
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

  return { organization, items };
}

const VALID_STATUSES: ObligationStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"];

/** Mirrors setOrgObligationStatus (AI Act module), org-scoped. */
export async function setOrgGdprObligationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const redirectTo = String(formData.get("redirectTo") ?? "/overview");
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);

  const assessment = await prisma.organizationGdprObligationAssessment.findFirst({
    where: { id, organizationId: { in: orgIds } },
  });
  if (!assessment) throw new Error("Not authorized for this obligation");

  const statusInput = String(formData.get("status"));
  if (!VALID_STATUSES.includes(statusInput as ObligationStatus)) {
    throw new Error(`Invalid status "${statusInput}"`);
  }

  await prisma.organizationGdprObligationAssessment.update({
    where: { id },
    data: { status: statusInput as ObligationStatus, reviewedByConsultant: false, updatedById: session.user.id },
  });

  revalidatePath("/overview");
  redirect(`${redirectTo}?notice=${encodeURIComponent("Status updated.")}`);
}
