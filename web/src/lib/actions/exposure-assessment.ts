"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import type { Prisma } from "@/generated/prisma/client";
import type { RegulationCode } from "@/generated/prisma/enums";
import type { AssessmentResult, RegulationKey } from "@/components/regulatory-exposure/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

/** AI_ACT scope is always true (it's the only module actually built) — never driven by this questionnaire. */
const REGULATION_KEY_TO_CODE: Record<RegulationKey, RegulationCode | null> = {
  aiAct: null,
  gdpr: "GDPR",
  nis2: "NIS2",
  dora: "DORA",
  cra: "CRA",
};

export async function getExposureAssessment(organizationId: string): Promise<AssessmentResult | null> {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  const row = await prisma.organizationExposureAssessment.findUnique({ where: { organizationId } });
  if (!row) return null;

  return {
    completedAt: row.completedAt.toISOString(),
    answers: row.answers as unknown as AssessmentResult["answers"],
    results: row.results as unknown as AssessmentResult["results"],
  };
}

/**
 * Saves a completed Regulatory Exposure assessment and seeds
 * OrganizationRegulationScope from its per-regulation reads — a
 * `not_applicable` result clears the regulation's scope flag, anything else
 * (low/monitor/high) sets it. Scope stays hand-editable afterward at
 * /settings/regulations; this just gives it a real starting point instead of
 * a blank direct checklist.
 */
export async function saveExposureAssessment(organizationId: string, result: AssessmentResult) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  await prisma.organizationExposureAssessment.upsert({
    where: { organizationId },
    create: {
      organizationId,
      completedAt: new Date(result.completedAt),
      answers: result.answers as Prisma.InputJsonValue,
      results: result.results as unknown as Prisma.InputJsonValue,
      completedById: session.user.id,
    },
    update: {
      completedAt: new Date(result.completedAt),
      answers: result.answers as Prisma.InputJsonValue,
      results: result.results as unknown as Prisma.InputJsonValue,
      completedById: session.user.id,
    },
  });

  await Promise.all(
    result.results.map((r) => {
      const regulation = REGULATION_KEY_TO_CODE[r.regulation];
      if (!regulation) return null;
      const applicable = r.level !== "not_applicable";
      return prisma.organizationRegulationScope.upsert({
        where: { organizationId_regulation: { organizationId, regulation } },
        create: { organizationId, regulation, applicable, updatedById: session.user.id },
        update: { applicable, updatedById: session.user.id },
      });
    }),
  );

  revalidatePath("/overview");
  revalidatePath("/settings/regulations");
  redirect(`/overview?notice=${encodeURIComponent("Regulatory exposure assessment saved.")}`);
}
