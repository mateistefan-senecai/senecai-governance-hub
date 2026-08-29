"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import { getObligationPlan } from "@/lib/actions/obligations";
import { getPmSteps, type PmStep } from "@/lib/obligations/pm-steps";
import type { ObligationStatus } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export type PmStepView = PmStep & { done: boolean };

/**
 * Round-2 spec Section 4 — the obligation-level PM sub-hub. Reuses
 * getObligationPlan for access control and lazy assessment-row creation,
 * then layers step-completion state on top for obligations that have a
 * configured template (see obligations/pm-steps.ts). An obligation without
 * one still works — the hub falls back to the plain status control.
 */
export async function getObligationPmHub(aiSystemId: string, obligationId: string) {
  const { system, items } = await getObligationPlan(aiSystemId);
  const item = items.find((i) => i.obligation.id === obligationId);
  if (!item) throw new Error("Obligation not applicable to this system");

  const template = getPmSteps(obligationId);
  if (!template) {
    return { system, obligation: item.obligation, assessment: item.assessment, steps: null };
  }

  const completions = await prisma.obligationPmStepCompletion.findMany({
    where: { obligationAssessmentId: item.assessment.id },
  });
  const doneById = new Map(completions.map((c) => [c.stepId, c.done]));
  const steps: PmStepView[] = template.map((step) => ({ ...step, done: doneById.get(step.id) ?? false }));

  return { system, obligation: item.obligation, assessment: item.assessment, steps };
}

function rollupStatus(doneCount: number, total: number): ObligationStatus {
  if (doneCount === 0) return "NOT_STARTED";
  if (doneCount === total) return "IMPLEMENTED";
  return "IN_PROGRESS";
}

/**
 * The obligation's top-level status rolls up from PM-hub step completion
 * (all steps done -> IMPLEMENTED, some -> IN_PROGRESS, none -> NOT_STARTED)
 * so `computeComplianceScore`/`score(sys)` keep working unchanged. A
 * NOT_APPLICABLE mark is left alone rather than overwritten by the rollup.
 */
export async function togglePmStep(formData: FormData) {
  const aiSystemId = String(formData.get("aiSystemId"));
  const obligationId = String(formData.get("obligationId"));
  const stepId = String(formData.get("stepId"));
  const next = String(formData.get("next")) === "true";

  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const assessment = await prisma.obligationAssessment.findFirst({
    where: { aiSystemId, obligationId, aiSystem: { organizationId: { in: orgIds } } },
  });
  if (!assessment) throw new Error("Not authorized for this obligation");

  const template = getPmSteps(obligationId);
  if (!template) throw new Error("This obligation has no configured PM-hub template");

  await prisma.obligationPmStepCompletion.upsert({
    where: { obligationAssessmentId_stepId: { obligationAssessmentId: assessment.id, stepId } },
    create: { obligationAssessmentId: assessment.id, stepId, done: next, updatedById: session.user.id },
    update: { done: next, updatedById: session.user.id },
  });

  if (assessment.status !== "NOT_APPLICABLE") {
    const completions = await prisma.obligationPmStepCompletion.findMany({
      where: { obligationAssessmentId: assessment.id },
    });
    const doneIds = new Set(completions.filter((c) => c.done).map((c) => c.stepId));
    const doneCount = template.filter((s) => doneIds.has(s.id)).length;
    const rolledUp = rollupStatus(doneCount, template.length);
    if (rolledUp !== assessment.status) {
      await prisma.obligationAssessment.update({
        where: { id: assessment.id },
        data: { status: rolledUp, reviewedByConsultant: false, updatedById: session.user.id },
      });
    }
  }

  revalidatePath(`/compliance-plan/${aiSystemId}/obligations/${obligationId}`);
  revalidatePath(`/compliance-plan/${aiSystemId}/obligations`);
  revalidatePath(`/compliance-plan/${aiSystemId}/gap`);
  revalidatePath(`/compliance-plan/${aiSystemId}/plan`);
  revalidatePath("/inventory");
}
