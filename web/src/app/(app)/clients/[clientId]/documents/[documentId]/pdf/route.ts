import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { clientWhere } from "@/lib/authz";
import { readDocumentPdf } from "@/lib/services/documents";
import { KIND_BY_ID, STATE_LABEL } from "@/lib/documents/kinds";

/**
 * Downloads one document version as it stands in its current state. Row-level
 * security keeps other tenants out; the role decides which states are
 * visible (a company user gets released documents only). Anything the
 * person may not see is a plain 404, so its existence is not confirmed.
 */
export async function GET(_req: Request, ctx: RouteContext<"/clients/[clientId]/documents/[documentId]/pdf">) {
  const { clientId, documentId } = await ctx.params;
  const session = await getCtx();
  const found = await withTenant(session, async (tx) => {
    const client = await tx.client.findFirst({ where: { AND: [{ id: clientId }, clientWhere(session)] } });
    if (!client) return null;
    const result = await readDocumentPdf(tx, session.role, client.id, documentId);
    return result ? { ...result, clientName: client.name } : null;
  });
  if (!found) return new Response("Not found", { status: 404 });

  const { doc, pdf, clientName } = found;
  const slug = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  const filename = `${slug(clientName)}_${slug(KIND_BY_ID.get(doc.kind)!.title)}_v${doc.version}_${slug(STATE_LABEL[doc.state])}.pdf`;
  return new Response(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteSize),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
