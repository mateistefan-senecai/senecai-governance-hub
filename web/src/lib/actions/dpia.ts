"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import type { DpiaOutcome } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s.length) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireActivityAccess(processingActivityId: string) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const activity = await prisma.processingActivity.findFirst({
    where: { id: processingActivityId, organizationId: { in: orgIds } },
  });
  if (!activity) throw new Error("Not authorized for this processing activity");
  return { session, activity };
}

/**
 * GDPR spec Section 5 — the DPIA sub-workflow. Step 1 (processing
 * description) is never stored here — the page reads it straight off the
 * parent ProcessingActivity. Lazily creates the row on first open, same
 * lazy-row-creation pattern as getObligationPlan.
 */
export async function getOrCreateDpia(processingActivityId: string) {
  const { session, activity } = await requireActivityAccess(processingActivityId);

  const existing = await prisma.dataProtectionImpactAssessment.findUnique({
    where: { processingActivityId },
  });
  if (existing) return { activity, dpia: existing };

  const dpia = await prisma.dataProtectionImpactAssessment.create({
    data: { processingActivityId, updatedById: session.user.id },
  });
  return { activity, dpia };
}

export async function updateDpia(formData: FormData) {
  const processingActivityId = String(formData.get("processingActivityId"));
  const { session } = await requireActivityAccess(processingActivityId);

  const outcome = enumOrNull<DpiaOutcome>(formData.get("outcome"));
  const necessityProportionality = emptyToNull(formData.get("necessityProportionality"));
  const risksIdentified = emptyToNull(formData.get("risksIdentified"));
  const mitigationMeasures = emptyToNull(formData.get("mitigationMeasures"));

  await prisma.dataProtectionImpactAssessment.update({
    where: { processingActivityId },
    data: {
      necessityProportionality,
      risksIdentified,
      mitigationMeasures,
      dpoSignOffName: emptyToNull(formData.get("dpoSignOffName")),
      dpoSignOffDate: dateOrNull(formData.get("dpoSignOffDate")),
      outcome,
      outcomeNote: emptyToNull(formData.get("outcomeNote")),
      // Art. 36 follow-through — only meaningful once flagged for
      // consultation, but harmless to persist either way (cleared if the
      // outcome is changed back away from that flag with blank fields).
      authorityConsultationDate: dateOrNull(formData.get("authorityConsultationDate")),
      authorityConsultationOutcome: emptyToNull(formData.get("authorityConsultationOutcome")),
      updatedById: session.user.id,
    },
  });

  // Rolls the DPIA obligation's own status up from the sub-workflow's
  // progress, same principle as the AI Act module's PM-hub step rollup: an
  // outcome recorded means done, any field filled means started, otherwise
  // it's untouched.
  const dpiaAssessment = await prisma.gdprObligationAssessment.findFirst({
    where: { processingActivityId, obligationId: "tied.art35-dpia" },
  });
  if (dpiaAssessment && dpiaAssessment.status !== "NOT_APPLICABLE") {
    const rolledUp = outcome
      ? "IMPLEMENTED"
      : necessityProportionality || risksIdentified || mitigationMeasures
        ? "IN_PROGRESS"
        : "NOT_STARTED";
    if (rolledUp !== dpiaAssessment.status) {
      await prisma.gdprObligationAssessment.update({
        where: { id: dpiaAssessment.id },
        data: { status: rolledUp, reviewedByConsultant: false, updatedById: session.user.id },
      });
    }
  }

  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/dpia`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/obligations`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/gap`);
  revalidatePath(`/gdpr/compliance-plan/${processingActivityId}/plan`);
  redirect(
    `/gdpr/compliance-plan/${processingActivityId}/dpia?notice=${encodeURIComponent("DPIA saved.")}`,
  );
}
