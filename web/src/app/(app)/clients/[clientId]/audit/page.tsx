import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/labels";
import { KIND_BY_ID } from "@/lib/documents/kinds";
import { visibleStates } from "@/lib/services/documents";

const ACTION_LABEL: Record<string, string> = {
  "client.created": "Client added",
  "applicability.run": "Applicability check run",
  "system.created": "AI system added",
  "system.updated": "AI system edited",
  "system.updated.reclassify": "AI system edited — classification reopened",
  "classification.submitted": "Classification submitted",
  "classification.confirmed": "Classification confirmed",
  "classification.overridden": "Classification overridden",
  "obligation.assessed": "Obligation assessed",
  "obligation.owner": "Obligation owner set",
  "vendorDocument.status": "Vendor document status changed",
  "action.updated": "Roadmap action updated",
  "enquiry.created": "Implementation requested",
  "document.generated": "Document generated (draft)",
  "document.submitted": "Document submitted for review",
  "document.sentBack": "Document sent back to draft",
  "document.approved": "Document approved",
  "document.released": "Document released to client",
  "document.outdated": "Document marked outdated",
};

export default async function AuditPage({ params }: PageProps<"/clients/[clientId]/audit">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const { events, names } = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    const systems = await tx.aiSystem.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        name: true,
        classifications: { select: { id: true } },
        systemObligations: { select: { id: true, obligationKey: true, actions: { select: { id: true } } } },
        vendorDocuments: { select: { id: true } },
      },
    });
    const enquiries = await tx.enquiry.findMany({ where: { clientId: client.id }, select: { id: true } });
    const names = new Map<string, string>([[client.id, client.name]]);
    for (const s of systems) {
      names.set(s.id, s.name);
      for (const c of s.classifications) names.set(c.id, s.name);
      for (const v of s.vendorDocuments) names.set(v.id, s.name);
      for (const o of s.systemObligations) {
        names.set(o.id, `${s.name} · ${o.obligationKey}`);
        for (const a of o.actions) names.set(a.id, `${s.name} · ${o.obligationKey}`);
      }
    }
    for (const e of enquiries) names.set(e.id, client.name);
    // Drafts are for reviewers only (concept note §7), so their history is too.
    const documents = await tx.document.findMany({
      where: { clientId: client.id, state: { in: visibleStates(ctx.role) } },
      select: { id: true, kind: true, version: true },
    });
    for (const d of documents) names.set(d.id, `${KIND_BY_ID.get(d.kind)?.title} · version ${d.version}`);
    const events = await tx.auditEvent.findMany({ where: { entityId: { in: [...names.keys()] } }, orderBy: { at: "desc" }, take: 300 });
    return { events, names };
  });

  return (
    <>
      <PageHeader
        crumb="Record"
        title="Audit log"
        subtitle="Who changed or approved what, and when. Entries cannot be edited or deleted."
      />
      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-ink text-panel">
              <tr className="font-narrow text-[10.5px] uppercase tracking-micro">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Who</th>
                <th className="px-4 py-3 font-semibold">What</th>
                <th className="px-4 py-3 font-semibold">On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-light">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-muted">
                    {formatDate(e.at)} {e.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5">{e.actorName}</td>
                  <td className="px-4 py-2.5 text-ink">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="px-4 py-2.5 text-muted">{names.get(e.entityId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
