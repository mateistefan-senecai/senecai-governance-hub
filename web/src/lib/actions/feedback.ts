"use server";

import { getCtx } from "@/lib/session";
import { withPublic } from "@/lib/tenant";
import { FEEDBACK_TOPIC, createConsultationRequest } from "@/lib/services/demo-requests";
import { ValidationError } from "@/lib/services/classification";
import type { DemoRequesterType } from "@/generated/prisma/enums";
import { str } from "./run";

export type FeedbackState = { ok: boolean; error?: string };

const REQUESTER_OF_ORG: Record<string, DemoRequesterType> = { LAW_FIRM: "LAW_FIRM", CONSULTANCY: "CONSULTANCY", COMPANY: "COMPANY" };

/**
 * "Send feedback" from any screen of the Hub. Sent by the user on purpose,
 * with their own name and email and the page they were on (a path, no
 * client data); it lands in SenecAI's request inbox.
 */
export async function sendFeedback(_prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const ctx = await getCtx();
  const message = str(form, "message");
  if (!message) return { ok: false, error: "Write what you would like us to know." };
  const page = str(form, "page").slice(0, 300);
  try {
    await withPublic((tx) =>
      createConsultationRequest(tx, {
        name: ctx.userName,
        email: ctx.email,
        organization: ctx.orgName,
        requesterType: REQUESTER_OF_ORG[ctx.orgType] ?? "OTHER",
        topic: `${FEEDBACK_TOPIC} ${page}`,
        message,
      }),
    );
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}
