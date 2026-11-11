// Where rendered PDFs are kept. The concept note (§8) suggests S3-compatible
// object storage in the EU for the repository, which arrives in Stage 2.
// Until then the bytes live in PostgreSQL (table DocumentFile), under the
// same row-level security as the rest of the client's data, behind this
// interface so they can move to object storage without touching callers.
//
// Renditions are insert-only (a database trigger rejects updates and
// deletes): a stored PDF is never edited.

import { createHash } from "node:crypto";
import type { Tx } from "@/lib/tenant";
import type { DocumentState } from "@/generated/prisma/enums";

export type StoredPdf = { bytes: Uint8Array; sha256: string; byteSize: number; createdAt: Date };

export interface DocumentStore {
  put(tx: Tx, file: { organizationId: string; documentId: string; state: DocumentState; bytes: Uint8Array }): Promise<{ sha256: string }>;
  get(tx: Tx, documentId: string, state: DocumentState): Promise<StoredPdf | null>;
}

export const postgresStore: DocumentStore = {
  async put(tx, { organizationId, documentId, state, bytes }) {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await tx.documentFile.create({
      data: { organizationId, documentId, state, byteSize: bytes.byteLength, sha256, data: Buffer.from(bytes) },
    });
    return { sha256 };
  },
  async get(tx, documentId, state) {
    const row = await tx.documentFile.findUnique({ where: { documentId_state: { documentId, state } } });
    if (!row) return null;
    return { bytes: new Uint8Array(row.data), sha256: row.sha256, byteSize: row.byteSize, createdAt: row.createdAt };
  },
};

export const documentStore: DocumentStore = postgresStore;
