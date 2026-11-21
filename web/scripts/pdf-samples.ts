// npx tsx scripts/pdf-samples.ts <out-dir>
//
// Writes one sample PDF of each deliverable for NovaBank from the seeded demo
// data: the released inventory as stored by the seed, and drafts of the
// others. Runs in a transaction that is rolled back, so the database is left
// as it was.

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { withTenant, withUser } from "../src/lib/tenant";
import { generateDocument, readDocumentPdf } from "../src/lib/services/documents";
import { MODULE_KINDS } from "../src/lib/documents/kinds";
import type { DocumentKind } from "../src/generated/prisma/enums";

class Rollback extends Error {}

async function main() {
  const out = process.argv[2] ?? "pdf-samples";
  mkdirSync(out, { recursive: true });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "consultant@senecai.dev" } });
  const m = await withUser(user.id, (tx) => tx.membership.findFirstOrThrow({ where: { userId: user.id } }));
  const reviewer = { userId: user.id, userName: user.name, orgId: m.organizationId, role: m.role };
  await withTenant(reviewer, async (tx) => {
    const client = await tx.client.findFirstOrThrow({ where: { name: "NovaBank Retail SRL" } });
    for (const kind of [...MODULE_KINDS, "PACK"] as DocumentKind[]) {
      const existing = await tx.document.findFirst({ where: { clientId: client.id, kind, outdated: false }, orderBy: { version: "desc" } });
      const doc = existing ?? (await generateDocument(tx, reviewer, client.id, kind));
      const result = await readDocumentPdf(tx, reviewer.role, client.id, doc.id);
      const file = path.join(out, `${kind.toLowerCase().replace("_", "-")}_v${doc.version}_${doc.state.toLowerCase()}.pdf`);
      writeFileSync(file, result!.pdf.bytes);
      console.log(`${file} (${result!.pdf.byteSize} bytes)`);
    }
    throw new Rollback();
  }).catch((e) => {
    if (!(e instanceof Rollback)) throw e;
  });
}

main().finally(() => prisma.$disconnect());
