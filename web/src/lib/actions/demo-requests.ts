"use server";

import { getCtx } from "@/lib/session";
import { withPublic, withTenant } from "@/lib/tenant";
import { assertAdmin, ForbiddenError } from "@/lib/authz";
import { ValidationError } from "@/lib/services/classification";
import {
  createDemoRequest,
  deleteDemoRequest,
  receivesDemoRequests,
  setDemoRequestStatus,
} from "@/lib/services/demo-requests";
import type { DemoRequestStatus } from "@/generated/prisma/enums";
import { actor, run, str } from "./run";

export type DemoFormState = { ok: boolean; error?: string; values?: Record<string, string> };

/** Seconds a person needs at least to fill the form; faster is a bot. */
const MIN_FILL_SECONDS = 3;

/** Public: called from /request-demo by a signed-out visitor. */
export async function submitDemoRequest(_prev: DemoFormState, form: FormData): Promise<DemoFormState> {
  const values = Object.fromEntries(
    ["name", "email", "organization", "requesterType", "role", "message"].map((k) => [k, str(form, k)]),
  );
  // Honeypot and timing: a bot gets the same "thank you" and nothing is stored.
  const renderedAt = Number(str(form, "renderedAt"));
  if (str(form, "website") || !renderedAt || Date.now() - renderedAt < MIN_FILL_SECONDS * 1000) return { ok: true };
  try {
    await withPublic((tx) => createDemoRequest(tx, { ...values, consent: str(form, "consent") } as never));
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message, values };
    throw e;
  }
  return { ok: true };
}

async function inboxCtx() {
  const ctx = await getCtx();
  assertAdmin(ctx);
  const allowed = await withTenant(ctx, (tx) => receivesDemoRequests(tx, ctx.orgId));
  if (!allowed) throw new ForbiddenError("This organisation does not receive demo requests.");
  return ctx;
}

export async function updateDemoRequestStatus(id: string, form: FormData) {
  await run("/demo-requests", async () => {
    const ctx = await inboxCtx();
    const status = str(form, "status") as DemoRequestStatus;
    if (!["NEW", "CONTACTED", "CLOSED"].includes(status)) throw new ValidationError("Unknown status.");
    await withTenant(ctx, (tx) => setDemoRequestStatus(tx, actor(ctx), id, status));
    return { notice: "Request updated." };
  });
}

export async function removeDemoRequest(id: string) {
  await run("/demo-requests", async () => {
    const ctx = await inboxCtx();
    await withTenant(ctx, (tx) => deleteDemoRequest(tx, actor(ctx), id));
    return { notice: "Request deleted." };
  });
}
