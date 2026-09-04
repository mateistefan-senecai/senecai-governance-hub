"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import type { DsarRequestType, DsarStatus } from "@/generated/prisma/enums";
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

const VALID_TYPES: DsarRequestType[] = [
  "ACCESS",
  "ERASURE",
  "RECTIFICATION",
  "OBJECTION",
  "PORTABILITY",
  "RESTRICTION",
];
const VALID_STATUSES: DsarStatus[] = ["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"];

/** Static list, no reminders/notifications for v1 (GDPR spec Section 6, resolved). */
export async function listDsarRequests() {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  return prisma.dsarRequest.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      organization: { select: { name: true } },
      processingActivity: { select: { name: true } },
    },
    orderBy: { dateReceived: "desc" },
  });
}

export async function createDsarRequest(formData: FormData) {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const organizationId = String(formData.get("organizationId") ?? session.user.organizationId);
  if (!orgIds.includes(organizationId)) {
    throw new Error("Not authorized to log a DSAR request for this organization");
  }

  const requestTypeInput = String(formData.get("requestType"));
  if (!VALID_TYPES.includes(requestTypeInput as DsarRequestType)) {
    throw new Error(`Invalid request type "${requestTypeInput}"`);
  }

  const dateReceivedInput = String(formData.get("dateReceived"));
  const dateReceived = new Date(dateReceivedInput);
  if (Number.isNaN(dateReceived.getTime())) throw new Error("A valid date received is required");

  // Art. 12(3): one month from receipt, extendable by hand later if needed.
  const statutoryDeadline = new Date(dateReceived);
  statutoryDeadline.setMonth(statutoryDeadline.getMonth() + 1);

  const processingActivityIdInput = emptyToNull(formData.get("processingActivityId"));
  if (processingActivityIdInput) {
    const activity = await prisma.processingActivity.findFirst({
      where: { id: processingActivityIdInput, organizationId },
    });
    if (!activity) throw new Error("Processing activity not found for this organization");
  }

  await prisma.dsarRequest.create({
    data: {
      organizationId,
      requestType: requestTypeInput as DsarRequestType,
      dateReceived,
      statutoryDeadline,
      requesterNote: emptyToNull(formData.get("requesterNote")),
      processingActivityId: processingActivityIdInput,
      createdById: session.user.id,
    },
  });

  revalidatePath("/gdpr/tracking");
  redirect(`/gdpr/tracking?notice=${encodeURIComponent("DSAR request logged.")}`);
}

export async function updateDsarStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  const request = await prisma.dsarRequest.findFirst({ where: { id, organizationId: { in: orgIds } } });
  if (!request) throw new Error("Not authorized for this DSAR request");

  const statusInput = String(formData.get("status"));
  if (!VALID_STATUSES.includes(statusInput as DsarStatus)) {
    throw new Error(`Invalid status "${statusInput}"`);
  }

  await prisma.dsarRequest.update({
    where: { id },
    data: { status: statusInput as DsarStatus },
  });

  revalidatePath("/gdpr/tracking");
}
