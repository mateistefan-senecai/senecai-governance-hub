import type { Tx } from "@/lib/tenant";
import type { ContentBundle } from "./types";

// Content versions are immutable once stored, so caching them by version
// number for the life of the process is safe.
const byVersion = new Map<string, ContentBundle>();

/**
 * The content version new work is built on: the latest published one, or —
 * until anything is published — the latest draft (the UI says so).
 */
export async function getCurrentContent(tx: Tx): Promise<ContentBundle> {
  const row =
    (await tx.contentVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } })) ??
    (await tx.contentVersion.findFirst({ where: { status: "DRAFT" }, orderBy: { createdAt: "desc" } }));
  if (!row) throw new Error("No legal content stored. Run `npm run content:publish`.");
  return remember(row.version, row.bundle);
}

/** The exact content version an earlier result was built on. */
export async function getContentVersion(tx: Tx, version: string): Promise<ContentBundle> {
  const cached = byVersion.get(version);
  if (cached) return cached;
  const row = await tx.contentVersion.findUniqueOrThrow({ where: { version } });
  return remember(row.version, row.bundle);
}

function remember(version: string, bundle: unknown): ContentBundle {
  const b = bundle as ContentBundle;
  byVersion.set(version, b);
  return b;
}
