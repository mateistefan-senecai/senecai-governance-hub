// Reads the content library from disk (content/ai-act/*.json). Used by the
// publish script and tests; the running app reads published versions from
// the ContentVersion table instead (src/lib/content/current.ts).

import { readFileSync } from "node:fs";
import path from "node:path";
import type { ContentBundle } from "./types";

export function loadBundleFromDisk(dir = path.join(process.cwd(), "content", "ai-act")): ContentBundle {
  const read = (file: string) => JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  const manifest = read("manifest.json");
  return {
    version: manifest.version,
    status: manifest.status,
    notes: manifest.notes,
    applicability: read("applicability.json"),
    classification: read("classification.json"),
    obligations: read("obligations.json"),
    dates: read("dates.json"),
    vendorDocuments: read("vendor-documents.json"),
  };
}
