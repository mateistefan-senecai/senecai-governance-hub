// npx tsx scripts/content.ts validate   — check content/ai-act/*.json
// npx tsx scripts/content.ts publish    — validate, then store it as a ContentVersion
//
// The version number comes from content/ai-act/manifest.json. A version that
// has already been stored is immutable: bump the version to change content.

import "dotenv/config";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { validateBundle } from "../src/lib/content/validate";
import { prisma } from "../src/lib/db";

async function main() {
  const command = process.argv[2] ?? "validate";
  const bundle = loadBundleFromDisk();
  const errors = validateBundle(bundle);
  if (errors.length) {
    console.error(`Content ${bundle.version} has ${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    `Content ${bundle.version} (${bundle.status}) is valid: ${bundle.classification.rules.length} classification rules, ${bundle.obligations.length} obligations.`,
  );
  if (command !== "publish") return;

  const existing = await prisma.contentVersion.findUnique({ where: { version: bundle.version } });
  if (existing) {
    if (JSON.stringify(existing.bundle) === JSON.stringify(bundle)) {
      console.log("Already stored, unchanged.");
      return;
    }
    console.error(`Version ${bundle.version} is already stored with different content. Bump the version in manifest.json.`);
    process.exit(1);
  }
  await prisma.contentVersion.create({
    data: {
      version: bundle.version,
      status: bundle.status,
      notes: bundle.notes,
      publishedAt: bundle.status === "PUBLISHED" ? new Date() : null,
      bundle: bundle as object,
    },
  });
  console.log(`Stored content version ${bundle.version}.`);
}

main().finally(() => prisma.$disconnect());
