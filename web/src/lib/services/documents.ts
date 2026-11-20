// PDF deliverables and their review workflow (spec §3, §4, §6; concept note
// §6, §7).
//
//   DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──release──▶ RELEASED
//     ▲                  │
//     └──send back───────┘
//
// - Only a reviewer or org admin generates, submits, approves and releases.
//   A company user sees released documents only (concept note §7: drafts
//   are visible to reviewers only; a released document is visible to the
//   client).
// - Approval records the named reviewer; the database refuses an approved
//   or released row without one (CHECK constraint, migration `documents`).
// - A document is an immutable snapshot with an input hash. When the
//   records or the legal content behind it change, it is marked outdated
//   and can no longer be approved or released; a new version is generated
//   as a draft and the old versions are kept.
// - Every transition is written to the append-only audit log.

import type { Tx } from "@/lib/tenant";
import type { Document, DocumentKind, DocumentState, MemberRole, Prisma } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/authz";
import { buildSnapshot, inputHash, loadClientRecord, type Snapshot } from "@/lib/documents/snapshot";
import { currentHashes, refreshDocuments } from "@/lib/documents/freshness";
import { rulesDrafter, type Narrative, type NarrativeDrafter } from "@/lib/documents/narrative";
import { renderDocumentPdf } from "@/lib/documents/render";
import { documentStore, type DocumentStore } from "@/lib/documents/store";
import { KIND_BY_ID, MODULE_KINDS } from "@/lib/documents/kinds";
import { audit, type Actor } from "./audit";
import { ValidationError } from "./classification";
import { aiActApplies } from "./inventory";

export type DocActor = Actor & { role: MemberRole };

export function canManageDocuments(role: MemberRole): boolean {
  return role === "REVIEWER" || role === "ORG_ADMIN";
}

function assertManager(actor: DocActor) {
  if (!canManageDocuments(actor.role)) throw new ForbiddenError("Only a reviewer can generate, approve or release documents.");
}

/** Which document versions a role may see. */
export function visibleStates(role: MemberRole): DocumentState[] {
  return canManageDocuments(role) ? ["DRAFT", "IN_REVIEW", "APPROVED", "RELEASED"] : ["RELEASED"];
}

// ── Open points ───────────────────────────────────────────────────────────

/**
 * What still stands between the snapshot and an approvable deliverable. A
 * reviewer cannot approve a classification report that contains a
 * classification nobody has reviewed, or a gap assessment with obligations
 * nobody has assessed. The inventory has no open points: it states what is
 * recorded, including "not classified".
 */
export function openPoints(snap: Snapshot): string[] {
  const kind = snap.kind;
  if (kind === "INVENTORY") return [];
  const points: string[] = [];
  for (const sys of snap.systems) {
    const c = sys.classification;
    if (!c) points.push(`${sys.name} is not classified.`);
    else if (c.stale) points.push(`${sys.name} changed after it was classified: reclassify it.`);
    else if (c.status === "PRELIMINARY") points.push(`The classification of ${sys.name} has not been reviewed.`);
  }
  if (kind === "GAP_ASSESSMENT" || kind === "ROADMAP" || kind === "PACK") {
    for (const sys of snap.systems) {
      const open = sys.obligations.filter((o) => o.status === "NOT_ASSESSED").length;
      const recheck = sys.obligations.filter((o) => o.needsReassessment).length;
      if (open) points.push(`${sys.name}: ${open} obligation${open > 1 ? "s" : ""} not assessed.`);
      if (recheck) points.push(`${sys.name}: ${recheck} obligation${recheck > 1 ? "s" : ""} to re-assess.`);
    }
  }
  return points;
}

export { refreshDocuments };

// ── Generation ────────────────────────────────────────────────────────────

export type GenerateOptions = { drafter?: NarrativeDrafter; store?: DocumentStore };

/**
 * Builds a new version of a deliverable as a draft: snapshot, input hash,
 * narrative, and the rendered PDF. Refused when the latest version is still
 * current (same inputs, not outdated): there is nothing new to say.
 */
export async function generateDocument(tx: Tx, actor: DocActor, clientId: string, kind: DocumentKind, opts: GenerateOptions = {}) {
  assertManager(actor);
  if (!KIND_BY_ID.has(kind)) throw new ValidationError("Unknown document type.");
  const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
  if (!aiActApplies(client)) throw new ValidationError("Documents are produced once the applicability check finds that the AI Act applies.");

  const rec = await loadClientRecord(tx, clientId);
  const snapshot = buildSnapshot(rec, kind);
  const hash = inputHash(snapshot);
  const latest = await tx.document.findFirst({ where: { clientId, kind }, orderBy: { version: "desc" } });
  if (latest && !latest.outdated) {
    if (latest.inputHash === hash) {
      throw new ValidationError(`Version ${latest.version} is built on the current records. Nothing has changed since.`);
    }
    // The records moved on and nobody flagged it yet: flag it now.
    await refreshDocuments(tx, actor, clientId, "records changed");
  }

  const drafter = opts.drafter ?? rulesDrafter;
  const narrative = await drafter.draft(snapshot);
  const doc = await tx.document.create({
    data: {
      organizationId: client.organizationId,
      clientId,
      kind,
      version: (latest?.version ?? 0) + 1,
      inputHash: hash,
      contentVersion: snapshot.contentVersion,
      snapshot: snapshot as unknown as Prisma.InputJsonObject,
      narrative: narrative as unknown as Prisma.InputJsonObject,
      narrativeSource: drafter.source,
      createdById: actor.userId,
      createdByName: actor.userName,
    },
  });
  await storeRendition(tx, doc, opts.store);
  await audit(tx, actor, {
    entityType: "Document",
    entityId: doc.id,
    action: "document.generated",
    after: { kind, version: doc.version, inputHash: hash, contentVersion: snapshot.contentVersion, narrativeSource: drafter.source },
  });
  return doc;
}

async function storeRendition(tx: Tx, doc: Document, store: DocumentStore = documentStore) {
  if (await store.get(tx, doc.id, doc.state)) return; // renditions are never replaced
  const bytes = await renderDocumentPdf({
    kind: doc.kind,
    version: doc.version,
    state: doc.state,
    snapshot: doc.snapshot as unknown as Snapshot,
    narrative: doc.narrative as unknown as Narrative,
    narrativeSource: doc.narrativeSource,
    inputHash: doc.inputHash,
    createdAt: doc.createdAt,
    createdByName: doc.createdByName,
    reviewerName: doc.reviewerName,
    approvedAt: doc.approvedAt,
    releasedAt: doc.releasedAt,
  });
  await store.put(tx, { organizationId: doc.organizationId, documentId: doc.id, state: doc.state, bytes });
}

// ── Transitions ───────────────────────────────────────────────────────────

export type Transition = "submit" | "sendBack" | "approve" | "release";

const FROM: Record<Transition, DocumentState> = { submit: "DRAFT", sendBack: "IN_REVIEW", approve: "IN_REVIEW", release: "APPROVED" };

export async function transitionDocument(
  tx: Tx,
  actor: DocActor,
  clientId: string,
  documentId: string,
  transition: Transition,
  opts: { comment?: string; store?: DocumentStore } = {},
) {
  assertManager(actor);
  const doc = await tx.document.findFirst({ where: { id: documentId, clientId } });
  if (!doc) throw new ValidationError("Document not found.");
  if (doc.state !== FROM[transition]) {
    throw new ValidationError(`This document is ${doc.state.toLowerCase().replace("_", " ")}; it cannot be ${transition === "sendBack" ? "sent back" : `${transition}d`} now.`);
  }
  const newer = await tx.document.count({ where: { clientId, kind: doc.kind, version: { gt: doc.version } } });
  if (newer) throw new ValidationError("A newer version of this document exists. Work on that one.");

  if (transition !== "sendBack") {
    // Check the inputs now, not only the flag: approving must never sign a
    // snapshot of records that have since changed.
    if (!doc.outdated) {
      const rec = await loadClientRecord(tx, clientId);
      if (currentHashes(rec, [doc.kind]).get(doc.kind) !== doc.inputHash) {
        throw new ValidationError("The records behind this document changed after it was generated. Generate a new version.");
      }
    }
    if (doc.outdated) throw new ValidationError("This document is outdated. Generate a new version.");
  }

  const now = new Date();
  let data: Prisma.DocumentUpdateInput;
  if (transition === "submit") {
    data = { state: "IN_REVIEW", submittedById: actor.userId, submittedAt: now };
  } else if (transition === "sendBack") {
    const comment = opts.comment?.trim() ?? "";
    if (comment.length < 10) throw new ValidationError("Say what needs to change before sending the document back (at least a sentence).");
    data = { state: "DRAFT", reviewComment: comment };
  } else if (transition === "approve") {
    const points = openPoints(doc.snapshot as unknown as Snapshot);
    if (points.length) throw new ValidationError(`Resolve the open points before approving: ${points.join(" ")}`);
    if (!actor.userName.trim()) throw new ValidationError("An approval needs a named reviewer.");
    data = { state: "APPROVED", reviewerId: actor.userId, reviewerName: actor.userName, approvedAt: now };
  } else {
    data = { state: "RELEASED", releasedById: actor.userId, releasedAt: now };
  }

  const updated = await tx.document.update({ where: { id: doc.id }, data });
  await storeRendition(tx, updated, opts.store);
  await audit(tx, actor, {
    entityType: "Document",
    entityId: doc.id,
    action: `document.${transition === "sendBack" ? "sentBack" : transition === "submit" ? "submitted" : transition === "approve" ? "approved" : "released"}`,
    before: { state: doc.state },
    after: {
      state: updated.state,
      kind: doc.kind,
      version: doc.version,
      ...(transition === "approve" ? { reviewer: actor.userName } : {}),
      ...(transition === "sendBack" ? { comment: updated.reviewComment } : {}),
    },
  });
  return updated;
}

// ── Reading ───────────────────────────────────────────────────────────────

/** The versions a role may see, newest first, grouped by kind in workflow order. */
export async function listDocuments(tx: Tx, role: MemberRole, clientId: string) {
  const docs = await tx.document.findMany({
    where: { clientId, state: { in: visibleStates(role) } },
    orderBy: [{ version: "desc" }],
    select: {
      id: true, kind: true, version: true, state: true, outdated: true, outdatedAt: true, inputHash: true, contentVersion: true,
      createdAt: true, createdByName: true, reviewerName: true, approvedAt: true, releasedAt: true, reviewComment: true, snapshot: true,
    },
  });
  return [...MODULE_KINDS, "PACK" as const].map((kind) => ({ kind, versions: docs.filter((d) => d.kind === kind) }));
}

/** The PDF of one version, as it stands in its current state, if the role may see it. */
export async function readDocumentPdf(tx: Tx, role: MemberRole, clientId: string, documentId: string, store: DocumentStore = documentStore) {
  const doc = await tx.document.findFirst({ where: { id: documentId, clientId, state: { in: visibleStates(role) } } });
  if (!doc) return null;
  const pdf = await store.get(tx, doc.id, doc.state);
  return pdf ? { doc, pdf } : null;
}
