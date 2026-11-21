// Outdated detection (concept note §6): a document stores the hash of the
// inputs it was built from; when the hash of the same inputs, taken now,
// differs, the document is outdated. Kept apart from rendering so the
// record services can call it without loading the PDF renderer.

import type { Tx } from "@/lib/tenant";
import type { DocumentKind } from "@/generated/prisma/enums";
import { audit, type Actor } from "@/lib/services/audit";
import { buildSnapshot, inputHash, loadClientRecord, type ClientRecord } from "./snapshot";

/** The hash each kind would have now. Loads the client's records once. */
export function currentHashes(rec: ClientRecord, kinds: DocumentKind[]): Map<DocumentKind, string> {
  return new Map([...new Set(kinds)].map((k) => [k, inputHash(buildSnapshot(rec, k))]));
}

/**
 * Marks every current document of the client whose inputs changed as
 * outdated (concept note §6). Called by every change to the records a
 * deliverable is built from — the living-register rules — and when the
 * documents are listed, which also catches a new legal content version.
 * Returns the documents it marked.
 */
export async function refreshDocuments(tx: Tx, actor: Actor, clientId: string, cause: string) {
  const docs = await tx.document.findMany({ where: { clientId, outdated: false }, select: { id: true, kind: true, version: true, inputHash: true, contentVersion: true } });
  if (!docs.length) return [];
  const rec = await loadClientRecord(tx, clientId);
  const hashes = currentHashes(rec, docs.map((d) => d.kind));
  const stale = docs.filter((d) => hashes.get(d.kind) !== d.inputHash);
  const now = new Date();
  for (const d of stale) {
    await tx.document.update({ where: { id: d.id }, data: { outdated: true, outdatedAt: now } });
    const reason = d.contentVersion !== rec.current.version ? "legal content version changed" : cause;
    await audit(tx, actor, {
      entityType: "Document",
      entityId: d.id,
      action: "document.outdated",
      after: { kind: d.kind, version: d.version, reason, legalContent: rec.current.version },
    });
  }
  return stale;
}

