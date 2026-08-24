"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import { getGeneralObligations } from "@/lib/obligations";
import type { ObligationPlanItem } from "@/lib/obligations/types";
import type { ObligationStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

/**
 * Round-2 spec Section 5 — GENERAL obligations (AI literacy, internal
 * governance policy, transparency) tracked once per organization rather
 * than duplicated across every AI system. Lazily creates NOT_STARTED rows
 * the same way `getObligationPlan` does for per-system obligations, so the
 * org-level plan is always complete without a separate seeding step.
 */
export async function getOrgObligationPlan(organizationId: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  const general = getGeneralObligations();

  const existing = await prisma.organizationObligationAssessment.findMany({
    where: { organizationId },
    select: { obligationId: true },
  });
  const existingIds = new Set(existing.map((e) => e.obligationId));
  const missing = general.filter((o) => !existingIds.has(o.id));
  if (missing.length > 0) {
    await prisma.organizationObligationAssessment.createMany({
      data: missing.map((o) => ({
        organizationId,
        obligationId: o.id,
        updatedById: session.user.id,
      })),
      skipDuplicates: true,
    });
  }

  const rows = await prisma.organizationObligationAssessment.findMany({ where: { organizationId } });
  const rowsById = new Map(rows.map((r) => [r.obligationId, r]));

  const items: ObligationPlanItem[] = general
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

  return { organization, items };
}

const VALID_STATUSES: ObligationStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "NOT_APPLICABLE",
];

/** Mirrors `setObligationStatus` in lib/actions/obligations.ts, org-scoped. */
export async function setOrgObligationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const redirectTo = String(formData.get("redirectTo") ?? "/overview");
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);

  const assessment = await prisma.organizationObligationAssessment.findFirst({
    where: { id, organizationId: { in: orgIds } },
  });
  if (!assessment) throw new Error("Not authorized for this obligation");

  const statusInput = String(formData.get("status"));
  if (!VALID_STATUSES.includes(statusInput as ObligationStatus)) {
    throw new Error(`Invalid status "${statusInput}"`);
  }

  await prisma.organizationObligationAssessment.update({
    where: { id },
    data: { status: statusInput as ObligationStatus, reviewedByConsultant: false, updatedById: session.user.id },
  });

  revalidatePath("/overview");
  redirect(`${redirectTo}?notice=${encodeURIComponent("Status updated.")}`);
}
