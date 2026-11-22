import { z } from "zod";
import type { Tx } from "@/lib/tenant";
import type { DemoRequestStatus, DemoRequesterType } from "@/generated/prisma/enums";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";

export const REQUESTER_TYPE_LABEL: Record<DemoRequesterType, string> = {
  LAW_FIRM: "Law firm",
  CONSULTANCY: "Compliance consultancy",
  COMPANY: "Company using or building AI",
  OTHER: "Other",
};

export const DEMO_STATUS_LABEL: Record<DemoRequestStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
};

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid work email.")),
  organization: z.string().trim().min(1, "Enter your organisation.").max(200),
  requesterType: z.enum(["LAW_FIRM", "CONSULTANCY", "COMPANY", "OTHER"], "Choose what describes you best."),
  role: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000, "Keep the message under 2,000 characters.").optional(),
  consent: z.literal("on", "Please agree to be contacted about your request."),
});

export type DemoRequestInput = z.input<typeof schema>;

/**
 * Stores a demo request from the landing page. Runs without a tenant
 * (withPublic): the database lets anyone insert a new request but only the
 * receiving organisation read it, so this uses createMany, which does not
 * read the row back.
 */
export async function createDemoRequest(tx: Tx, input: DemoRequestInput, now = new Date()) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  const { consent: _consent, role, message, ...rest } = parsed.data;
  void _consent;
  await tx.demoRequest.createMany({
    data: [{ ...rest, role: role || null, message: message || null, consentAt: now }],
  });
}

/** Whether the active organisation receives demo requests (SenecAI). */
export async function receivesDemoRequests(tx: Tx, orgId: string) {
  const org = await tx.organization.findUnique({ where: { id: orgId }, select: { receivesDemoRequests: true } });
  return org?.receivesDemoRequests ?? false;
}

export async function setDemoRequestStatus(tx: Tx, actor: Actor, id: string, status: DemoRequestStatus) {
  const before = await tx.demoRequest.findUnique({ where: { id } });
  if (!before) throw new ValidationError("That request no longer exists.");
  if (before.status === status) return;
  const data = { status, handledById: actor.userId, handledByName: actor.userName, handledAt: new Date() };
  await tx.demoRequest.update({ where: { id }, data });
  await audit(tx, actor, {
    entityType: "DemoRequest",
    entityId: id,
    action: "demo_request.status",
    before: { status: before.status },
    after: { status },
  });
}

/** Erasure or end of retention. The audit event keeps no personal data. */
export async function deleteDemoRequest(tx: Tx, actor: Actor, id: string) {
  const { count } = await tx.demoRequest.deleteMany({ where: { id } });
  if (!count) throw new ValidationError("That request no longer exists.");
  await audit(tx, actor, { entityType: "DemoRequest", entityId: id, action: "demo_request.deleted" });
}

/**
 * A signed-in user asks SenecAI for help with a regulation the Hub does not
 * cover. Sent explicitly by the user, with their own contact details and the
 * client's name; it lands in SenecAI's request inbox like a demo request.
 */
export async function createConsultationRequest(
  tx: Tx,
  input: { name: string; email: string; organization: string; requesterType: DemoRequesterType; topic: string; message: string | null },
  now = new Date(),
) {
  if (!input.topic) throw new ValidationError("Choose what you need help with.");
  if (input.message && input.message.length > 2000) throw new ValidationError("Keep the message under 2,000 characters.");
  await tx.demoRequest.createMany({
    data: [{ ...input, message: input.message || null, consentAt: now }],
  });
}
