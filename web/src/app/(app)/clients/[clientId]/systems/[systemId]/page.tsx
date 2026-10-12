import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canReview, requireSystem } from "@/lib/authz";
import { getContentVersion } from "@/lib/content/current";
import { viewOf, PARTIES, RISK_CLASSES } from "@/lib/services/classification";
import { readiness } from "@/lib/services/assessment";
import {
  confirmClassificationAction,
  overrideClassificationAction,
  setVendorDocumentStatus,
} from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeading } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Citation } from "@/components/ui/citation";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  AUTONOMY_LABEL,
  CLASSIFICATION_STATUS_LABEL,
  OBLIGATION_STATUS_LABEL,
  OBLIGATION_STATUS_TONE,
  ORIGIN_LABEL,
  RISK_LABEL,
  RISK_TONE,
  ROLE_LABEL,
  STAGE_LABEL,
  USE_TYPE_LABEL,
  VENDOR_STATUS_LABEL,
  formatDate,
  roleList,
} from "@/lib/labels";

export default async function SystemPage({ params }: PageProps<"/clients/[clientId]/systems/[systemId]">) {
  const { clientId, systemId } = await params;
  const ctx = await getCtx();
  const data = await withTenant(ctx, async (tx) => {
    const { system } = await requireSystem(tx, ctx, clientId, systemId);
    const current = await tx.classification.findFirst({ where: { systemId, isCurrent: true } });
    const obligations = await tx.systemObligation.findMany({
      where: { systemId, active: true },
      orderBy: [{ party: "asc" }, { appliesFrom: "asc" }],
    });
    const vendorDocs = await tx.vendorDocument.findMany({ where: { systemId }, orderBy: { kind: "asc" } });
    const bundle = current ? await getContentVersion(tx, current.contentVersion) : null;
    const reviewer = current?.reviewedById ? await tx.user.findUnique({ where: { id: current.reviewedById } }) : null;
    return { system, current, obligations, vendorDocs, bundle, reviewer };
  });
  const { system, current, obligations, vendorDocs, bundle, reviewer } = data;
  const base = `/clients/${clientId}/systems/${systemId}`;
  const isReviewer = canReview(ctx);
  const view = current ? viewOf(current) : null;
  const defs = new Map(bundle?.obligations.map((o) => [o.key, o]));
  const vendorLabels = new Map(bundle?.vendorDocuments.map((d) => [d.kind, d]));
  // Content-library order follows the articles.
  const order = new Map(bundle?.obligations.map((o, i) => [o.key, i]));
  obligations.sort((a, b) => (order.get(a.obligationKey) ?? 0) - (order.get(b.obligationKey) ?? 0));
  const parties = [...new Set(obligations.map((o) => o.party))].sort();

  return (
    <>
      <PageHeader
        crumb="AI system"
        title={system.name}
        subtitle={system.purpose}
        actions={
          <>
            <Button href={`${base}/edit`}>Edit record</Button>
            <Button variant={current ? "ghost" : "primary"} href={`${base}/classify`}>
              {current ? "Reclassify" : "Classify"}
            </Button>
          </>
        }
      />

      {system.classificationStale && (
        <div className="border-b border-hairline bg-gold-tint px-8 py-3 text-[13px] text-gold-deep">
          <strong>The system record changed after it was classified.</strong> The classification below may no longer be right, and assessed
          obligations are flagged for review.{" "}
          <Link href={`${base}/classify`} className="font-semibold underline">
            Reclassify now
          </Link>
        </div>
      )}

      <div className="grid gap-6 p-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="space-y-6">
          {/* ── Step 2: classification ── */}
          <Panel padded={false}>
            <PanelHeading kicker="Step 2" title="Risk classification" />
            {!current || !view ? (
              <div className="p-5">
                <p className="text-[13.5px] text-muted">Not classified yet. The questionnaire takes a few minutes.</p>
                <div className="mt-3">
                  <Button variant="primary" href={`${base}/classify`}>
                    Classify this system
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div>
                    <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Risk class</p>
                    <div className="mt-1">
                      <Tag tone={RISK_TONE[view.riskClass]}>{RISK_LABEL[view.riskClass]}</Tag>
                    </div>
                  </div>
                  <div>
                    <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Company’s role</p>
                    <p className="mt-1 text-[14px] font-semibold text-ink">{roleList(view.roles)}</p>
                  </div>
                  <div>
                    <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Status</p>
                    <p className="mt-1 text-[13px] text-ink">
                      {CLASSIFICATION_STATUS_LABEL[current.status]}
                      {reviewer && (
                        <span className="text-muted">
                          {" "}
                          by {reviewer.name}, {formatDate(current.reviewedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="ml-auto text-right text-[11.5px] text-muted">
                    Version {current.version} · {formatDate(current.createdAt)}
                    <br />
                    Legal content {current.contentVersion}
                  </p>
                </div>

                {current.status === "OVERRIDDEN" && current.overrideReason && (
                  <div className="rounded-lg border border-gold bg-gold-tint/50 p-3 text-[13px] text-gold-deep">
                    <span className="font-semibold">Reviewer override:</span> {current.overrideReason}
                  </div>
                )}

                {view.attention.length > 0 && (
                  <ul className="space-y-1.5 rounded-lg border border-hairline bg-panel p-3">
                    {view.attention.map((a) => (
                      <li key={a} className="text-[12.5px] text-body">
                        <span className="mr-1.5 font-semibold text-gold-hover">For the reviewer:</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}

                <div>
                  <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">Legal reasoning</p>
                  <ol className="mt-2 space-y-2.5 border-l-2 border-hairline pl-4">
                    {view.reasoning.map((r) => (
                      <li key={r.ruleId} className="text-[13px] leading-relaxed text-body">
                        {r.rationale} <Citation>{r.citation}</Citation>
                      </li>
                    ))}
                  </ol>
                </div>

                {isReviewer && (
                  <div className="flex flex-wrap items-start gap-3 border-t border-hairline pt-4">
                    {current.status === "PRELIMINARY" && !system.classificationStale && (
                      <form action={confirmClassificationAction.bind(null, clientId, systemId)}>
                        <Button variant="primary">Confirm classification</Button>
                      </form>
                    )}
                    <details className="group min-w-[280px] flex-1">
                      <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-hairline px-4 py-2 text-[12.5px] font-semibold text-ink hover:border-gold hover:bg-gold-tint">
                        Override…
                      </summary>
                      <form
                        action={overrideClassificationAction.bind(null, clientId, systemId)}
                        className="mt-3 space-y-3 rounded-lg border border-hairline bg-panel p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-[12.5px]">
                            <span className="font-semibold text-ink">Risk class</span>
                            <select name="riskClass" defaultValue={view.riskClass} className="mt-1 block w-full rounded-md border border-hairline bg-surface px-2 py-1.5">
                              {RISK_CLASSES.map((r) => (
                                <option key={r} value={r}>
                                  {RISK_LABEL[r]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <fieldset className="text-[12.5px]">
                            <legend className="font-semibold text-ink">Roles</legend>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              {PARTIES.map((p) => (
                                <label key={p} className="flex items-center gap-1.5">
                                  <input type="checkbox" name="roles" value={p} defaultChecked={view.roles.includes(p)} className="accent-[var(--color-gold)]" />
                                  {ROLE_LABEL[p]}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </div>
                        <fieldset className="text-[12.5px]">
                          <legend className="font-semibold text-ink">If high-risk, on what basis</legend>
                          <div className="mt-1 flex gap-4">
                            <label className="flex items-center gap-1.5">
                              <input type="checkbox" name="highRiskBasis" value="annexI" className="accent-[var(--color-gold)]" /> Annex I (Art. 6(1))
                            </label>
                            <label className="flex items-center gap-1.5">
                              <input type="checkbox" name="highRiskBasis" value="annexIII" className="accent-[var(--color-gold)]" /> Annex III (Art. 6(2))
                            </label>
                          </div>
                        </fieldset>
                        <label className="block text-[12.5px]">
                          <span className="font-semibold text-ink">Written justification</span>
                          <span className="block text-muted">Kept in the record and shown with the classification.</span>
                          <textarea name="reason" required minLength={20} rows={3} className="mt-1 block w-full rounded-md border border-hairline bg-surface px-2 py-1.5" />
                        </label>
                        <Button variant="ink">Record override</Button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* ── Steps 3 & 5: obligations and their assessment ── */}
          {current && (
            <Panel padded={false}>
              <PanelHeading
                kicker="Steps 3 & 5"
                title="Obligations"
                action={
                  <div className="w-40">
                    <ProgressBar percent={readiness(obligations)} showLabel />
                  </div>
                }
              />
              {obligations.length === 0 ? (
                <p className="p-5 text-[13.5px] text-muted">No obligations follow from this classification.</p>
              ) : (
                parties.map((party) => (
                  <div key={party}>
                    <p className="border-b border-hairline-light bg-panel px-5 py-2 font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
                      As {party.split(" & ").map((p) => ROLE_LABEL[p] ?? p).join(" & ").toLowerCase()}
                    </p>
                    <ul className="divide-y divide-hairline-light">
                      {obligations
                        .filter((o) => o.party === party)
                        .map((o) => {
                          const def = defs.get(o.obligationKey);
                          return (
                            <li key={o.id}>
                              <Link href={`${base}/obligations/${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-row-hover">
                                <span className="w-28 shrink-0 font-narrow text-[11.5px] font-semibold text-gold-deep">{def?.article}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[13.5px] font-medium text-ink">{def?.title ?? o.obligationKey}</span>
                                  <span className="block text-[11.5px] text-muted">
                                    Applies from {formatDate(o.appliesFrom)}
                                    {o.ownerName && ` · Owner: ${o.ownerName}`}
                                  </span>
                                </span>
                                {o.needsReassessment && <Tag tone="prelim">Re-assess</Tag>}
                                <Tag tone={OBLIGATION_STATUS_TONE[o.status]}>{OBLIGATION_STATUS_LABEL[o.status]}</Tag>
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))
              )}
            </Panel>
          )}
        </div>

        {/* ── Side: record and vendor register ── */}
        <div className="space-y-6">
          <Panel padded={false}>
            <PanelHeading kicker="Step 1" title="Inventory record" action={<Button size="sm" href={`${base}/edit`}>Edit</Button>} />
            <dl className="divide-y divide-hairline-light text-[13px]">
              {[
                ["Owner", [system.ownerName, system.ownerRole].filter(Boolean).join(", ")],
                ["Origin", `${ORIGIN_LABEL[system.origin]}${system.supplier ? ` · ${system.supplier}` : ""}`],
                ["Deployed", system.deploymentContext],
                ["Use", USE_TYPE_LABEL[system.useType]],
                ["Data", system.dataCategories.join(", ") || "—"],
                ["Autonomy", AUTONOMY_LABEL[system.autonomy]],
                ["Stage", STAGE_LABEL[system.stage]],
                ["People affected", system.affectedPersons ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="px-5 py-2.5">
                  <dt className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">{label}</dt>
                  <dd className="mt-0.5 text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {system.origin !== "BUILT" && (
            <Panel padded={false}>
              <PanelHeading kicker="Vendor register" title={`From ${system.supplier ?? "the supplier"}`} />
              {vendorDocs.length === 0 ? (
                <p className="p-5 text-[12.5px] text-muted">The documents to request appear once the system is classified.</p>
              ) : (
                <ul className="divide-y divide-hairline-light">
                  {vendorDocs.map((d) => {
                    const label = vendorLabels.get(d.kind);
                    return (
                      <li key={d.id} className="px-5 py-3">
                        <p className="text-[13px] text-ink">{label?.label ?? d.kind}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          {label && <Citation>{label.citation}</Citation>}
                          <form action={setVendorDocumentStatus.bind(null, clientId, systemId, d.id)} className="flex gap-1.5">
                            <select name="status" defaultValue={d.status} className="rounded-md border border-hairline bg-surface px-1.5 py-1 text-[12px]">
                              {Object.entries(VENDOR_STATUS_LABEL).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-md border border-hairline px-2 text-[11.5px] font-semibold hover:border-gold">Set</button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
