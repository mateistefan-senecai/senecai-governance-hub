import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { aiActApplies } from "@/lib/services/inventory";
import { canManageDocuments, listDocuments, openPoints } from "@/lib/services/documents";
import { refreshDocuments } from "@/lib/documents/freshness";
import { buildSnapshot, inputHash, loadClientRecord, type Snapshot } from "@/lib/documents/snapshot";
import { DOCUMENT_KINDS, STATE_LABEL } from "@/lib/documents/kinds";
import { generateDocumentAction, transitionDocumentAction } from "@/lib/actions/documents";
import { actor } from "@/lib/actions/run";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Tag, type TagTone } from "@/components/ui/tag";
import { Citation } from "@/components/ui/citation";
import { formatDate } from "@/lib/labels";
import type { DocumentKind, DocumentState } from "@/generated/prisma/enums";

const STATE_TONE: Record<DocumentState, TagTone> = {
  DRAFT: "muted",
  IN_REVIEW: "prelim",
  APPROVED: "outline",
  RELEASED: "ink-fill",
};

export default async function DocumentsPage({ params }: PageProps<"/clients/[clientId]/documents">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const manager = canManageDocuments(ctx.role);
  const { client, groups, live } = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    // Catches what record changes cannot: a newly published legal content version.
    await refreshDocuments(tx, actor(ctx), client.id, "records or legal content changed");
    const groups = await listDocuments(tx, ctx.role, client.id);
    // What a new version would be built on, for reviewers: its hash and open points.
    const live = new Map<DocumentKind, { hash: string; points: string[] }>();
    if (manager && aiActApplies(client)) {
      const rec = await loadClientRecord(tx, client.id);
      for (const k of DOCUMENT_KINDS) {
        const snap = buildSnapshot(rec, k.kind);
        live.set(k.kind, { hash: inputHash(snap), points: openPoints(snap) });
      }
    }
    return { client, groups, live };
  });
  if (!aiActApplies(client)) redirect(`/clients/${client.id}/applicability`);

  const base = `/clients/${client.id}/documents`;
  const pdf = (id: string) => `${base}/${id}/pdf`;

  return (
    <>
      <PageHeader
        crumb="Deliverables"
        title="Documents"
        subtitle={
          manager
            ? "Each PDF is a dated snapshot of the record, generated as a draft, reviewed, approved by a named reviewer and released to the client. When the record changes, the PDF is marked outdated and a new version is generated; earlier versions are kept."
            : "The PDFs your reviewer has approved and released. Each is a dated snapshot of the record; when the record changes, it is marked outdated until a new version is released."
        }
      />
      <div className="space-y-5 p-8">
        {DOCUMENT_KINDS.map((def) => {
          const versions = groups.find((g) => g.kind === def.kind)?.versions ?? [];
          const latest = versions[0];
          const older = versions.slice(1);
          const now = live.get(def.kind);
          const upToDate = latest && !latest.outdated && now?.hash === latest.inputHash;
          const canGenerate = manager && !upToDate;
          const points = latest && !latest.outdated ? openPoints(latest.snapshot as unknown as Snapshot) : (now?.points ?? []);
          return (
            <Panel key={def.kind} padded={false} className="scroll-mt-6">
              <div id={def.kind} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
                <div>
                  <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">{def.step}</p>
                  <h2 className="text-[17px] font-semibold text-ink">{def.title}</h2>
                  <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted">{def.description}</p>
                  <Citation>{def.provisions}</Citation>
                </div>

                <div className="rounded-lg border border-hairline bg-panel p-4 text-[12.5px]">
                  {!latest ? (
                    <p className="text-muted">{manager ? "Not generated yet." : "Not released yet."}</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">Version {latest.version}</span>
                        <Tag tone={STATE_TONE[latest.state]}>{STATE_LABEL[latest.state]}</Tag>
                        {latest.outdated && <Tag tone="gold-fill">Outdated</Tag>}
                      </div>
                      <dl className="mt-2 space-y-0.5 text-muted">
                        <div>
                          Generated {formatDate(latest.createdAt)} by {latest.createdByName} · legal content {latest.contentVersion}
                        </div>
                        {latest.reviewerName && (
                          <div>
                            Approved by <span className="font-semibold text-ink">{latest.reviewerName}</span>, {formatDate(latest.approvedAt)}
                          </div>
                        )}
                        {latest.releasedAt && <div>Released to the client {formatDate(latest.releasedAt)}</div>}
                        {latest.outdated && (
                          <div className="text-gold-deep">
                            The record or the legal content changed on {formatDate(latest.outdatedAt)}.{" "}
                            {manager ? "Generate a new version." : "Your reviewer will issue a new version."}
                          </div>
                        )}
                        {manager && latest.state === "DRAFT" && latest.reviewComment && (
                          <div className="text-ink">
                            <span className="font-semibold">Sent back:</span> {latest.reviewComment}
                          </div>
                        )}
                      </dl>
                    </>
                  )}

                  {manager && points.length > 0 && latest?.state !== "APPROVED" && latest?.state !== "RELEASED" && (
                    <div className="mt-3 rounded-md border border-hairline bg-surface p-2.5">
                      <p className="font-semibold text-ink">Open before approval</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
                        {points.slice(0, 6).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                        {points.length > 6 && <li>and {points.length - 6} more</li>}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    {latest && (
                      // A plain link: the PDF is a file download, not a page to navigate to.
                      <a
                        href={pdf(latest.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-hairline px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-gold hover:bg-gold-tint"
                      >
                        Download PDF
                      </a>
                    )}
                    {canGenerate && (
                      <form action={generateDocumentAction.bind(null, client.id, def.kind)}>
                        <Button size="sm" variant={latest ? "ghost" : "primary"}>
                          {latest ? `Generate version ${latest.version + 1}` : "Generate draft"}
                        </Button>
                      </form>
                    )}
                    {manager && latest && !latest.outdated && latest.state === "DRAFT" && (
                      <form action={transitionDocumentAction.bind(null, client.id, latest.id, "submit")}>
                        <Button size="sm" variant="ink">Submit for review</Button>
                      </form>
                    )}
                    {manager && latest && !latest.outdated && latest.state === "IN_REVIEW" && (
                      <form action={transitionDocumentAction.bind(null, client.id, latest.id, "approve")}>
                        <Button size="sm" variant="primary" disabled={points.length > 0} title={points.length ? "Resolve the open points first" : undefined}>
                          Approve as {ctx.userName}
                        </Button>
                      </form>
                    )}
                    {manager && latest && !latest.outdated && latest.state === "APPROVED" && (
                      <form action={transitionDocumentAction.bind(null, client.id, latest.id, "release")}>
                        <Button size="sm" variant="primary">Release to client</Button>
                      </form>
                    )}
                    {manager && latest && latest.state === "IN_REVIEW" && (
                      <details className="w-full">
                        <summary className="cursor-pointer text-[12px] font-semibold text-muted hover:text-ink">Send back to draft…</summary>
                        <form action={transitionDocumentAction.bind(null, client.id, latest.id, "sendBack")} className="mt-2 space-y-2">
                          <textarea
                            name="comment"
                            required
                            minLength={10}
                            rows={2}
                            placeholder="What needs to change"
                            className="block w-full rounded-md border border-hairline bg-surface px-2 py-1.5"
                          />
                          <Button size="sm">Send back</Button>
                        </form>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {older.length > 0 && (
                <details className="border-t border-hairline-light px-5 py-3">
                  <summary className="cursor-pointer text-[12.5px] font-semibold text-muted">Earlier versions ({older.length})</summary>
                  <ul className="mt-2 divide-y divide-hairline-light text-[12.5px]">
                    {older.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span className="font-semibold text-ink">Version {d.version}</span>
                        <span className="text-muted">{STATE_LABEL[d.state]}</span>
                        {d.outdated && <span className="text-gold-deep">outdated</span>}
                        <span className="text-muted">
                          generated {formatDate(d.createdAt)}
                          {d.reviewerName && ` · approved by ${d.reviewerName}, ${formatDate(d.approvedAt)}`}
                        </span>
                        <a href={pdf(d.id)} className="ml-auto font-semibold text-gold-hover underline-offset-2 hover:underline">
                          PDF
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
