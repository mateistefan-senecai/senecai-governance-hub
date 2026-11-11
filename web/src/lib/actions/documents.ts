"use server";

import { getCtx, type Ctx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { refreshDocuments } from "@/lib/documents/freshness";
import { isDocumentKind, KIND_BY_ID } from "@/lib/documents/kinds";
import { generateDocument, transitionDocument, type DocActor, type Transition } from "@/lib/services/documents";
import { ValidationError } from "@/lib/services/classification";
import { actor, run, str } from "./run";

const docActor = (ctx: Ctx): DocActor => ({ ...actor(ctx), role: ctx.role });

/**
 * Flags outdated documents in a transaction of its own, so the flag (and
 * its audit entry) is kept even when the action that follows is refused
 * because the document turned out to be outdated.
 */
async function refreshFirst(ctx: Ctx, clientId: string) {
  await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    await refreshDocuments(tx, actor(ctx), client.id, "records or legal content changed");
  });
}

export async function generateDocumentAction(clientId: string, kind: string) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/documents`;
  await run(back, async () => {
    if (!isDocumentKind(kind)) throw new ValidationError("Unknown document type.");
    await refreshFirst(ctx, clientId);
    const doc = await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      return generateDocument(tx, docActor(ctx), client.id, kind);
    });
    return { to: `${back}#${kind}`, notice: `${KIND_BY_ID.get(kind)!.title}, version ${doc.version}, generated as a draft.` };
  });
}

const DONE: Record<Transition, string> = {
  submit: "submitted for review",
  sendBack: "sent back to draft",
  approve: "approved",
  release: "released to the client",
};

export async function transitionDocumentAction(clientId: string, documentId: string, transition: Transition, form: FormData) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/documents`;
  await run(back, async () => {
    if (!(transition in DONE)) throw new ValidationError("Unknown action.");
    await refreshFirst(ctx, clientId);
    const doc = await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      return transitionDocument(tx, docActor(ctx), client.id, documentId, transition, { comment: str(form, "comment") });
    });
    return { to: `${back}#${doc.kind}`, notice: `${KIND_BY_ID.get(doc.kind)!.title}, version ${doc.version}, ${DONE[transition]}.` };
  });
}
