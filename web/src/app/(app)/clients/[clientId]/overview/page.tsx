import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { getContentVersion } from "@/lib/content/current";
import type { Finding } from "@/lib/services/inventory";
import { readiness, urgentActions } from "@/lib/services/assessment";
import { visibleStates } from "@/lib/services/documents";
import { listUpdates } from "@/lib/services/notifications";
import { DOCUMENT_KINDS, STATE_LABEL } from "@/lib/documents/kinds";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { UpdatesPanel } from "@/components/updates-panel";
import { ACTION_STATUS_LABEL, RISK_LABEL, formatDate } from "@/lib/labels";
import type { ContentBundle } from "@/lib/content/types";

const RISK_ORDER = ["PROHIBITED", "HIGH_RISK", "LIMITED", "MINIMAL", "OUT_OF_SCOPE"] as const;
const RISK_BAR: Record<string, string> = {
  PROHIBITED: "bg-[#7a1f12]",
  HIGH_RISK: "bg-ink",
  LIMITED: "bg-gold",
  MINIMAL: "bg-gold-light",
  OUT_OF_SCOPE: "bg-hairline",
  NONE: "bg-hairline-light",
};
const APPLIES = { yes: "Applies", likely: "Likely applies", no: "Does not apply" } as const;

/**
 * The client's starting screen: what applies, where the AI systems stand,
 * how far compliance has come, what to do next and the documents issued.
 * Every figure links to the page where the work is done.
 */
export default async function OverviewPage({ params }: PageProps<"/clients/[clientId]/overview">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const data = await withTenant(ctx, async (tx) => {
    const client = await requireClient(tx, ctx, clientId);
    if (!client.applicability) return null;
    const systems = await tx.aiSystem.findMany({
      where: { clientId: client.id },
      orderBy: { name: "asc" },
      include: { classifications: { where: { isCurrent: true }, select: { effective: true, status: true } } },
    });
    const obligations = await tx.systemObligation.findMany({
      where: { clientId: client.id, active: true },
      select: { status: true, active: true, needsReassessment: true },
    });
    const actions = await tx.action.findMany({
      where: { clientId: client.id, status: { not: "DONE" } },
      include: { systemObligation: { include: { system: { select: { id: true, name: true } } } } },
    });
    const versions = [...new Set(actions.map((a) => a.systemObligation.contentVersion))];
    const bundles = new Map<string, ContentBundle>();
    for (const v of versions) bundles.set(v, await getContentVersion(tx, v));
    const documents = await tx.document.findMany({
      where: { clientId: client.id, state: { in: visibleStates(ctx.role) } },
      orderBy: { version: "desc" },
      select: { id: true, kind: true, version: true, state: true, outdated: true, createdAt: true, approvedAt: true, releasedAt: true, reviewerName: true },
    });
    const isClientUser = ctx.role === "COMPANY_USER";
    const updates = isClientUser ? await listUpdates(tx, client.id) : [];
    const seenAt = isClientUser
      ? ((await tx.membership.findUnique({ where: { id: ctx.membershipId }, select: { updatesSeenAt: true } }))?.updatesSeenAt ?? null)
      : null;
    const urgent = urgentActions(actions, bundles);
    return { client, systems, obligations, actions, urgent, documents, updates, seenAt };
  });
  if (!data) redirect(`/clients/${clientId}/applicability`);
  const { client, systems, obligations, actions, urgent, documents, updates, seenAt } = data;
  const base = `/clients/${client.id}`;

  // ── Figures ──────────────────────────────────────────────────────────────
  const findings = ((client.applicability as { findings?: Finding[] } | null)?.findings ?? []).filter((f) => f.applies !== "no");
  const riskOf = (s: (typeof systems)[number]) => (s.classifications[0]?.effective as { riskClass?: string } | undefined)?.riskClass ?? "NONE";
  const byRisk = (r: string) => systems.filter((s) => riskOf(s) === r).length;
  const total = systems.length;
  const classified = systems.filter((s) => s.classifications.length).length;
  const awaitingReview = systems.filter((s) => s.classifications[0]?.status === "PRELIMINARY").length;
  const met = obligations.filter((o) => o.status === "COMPLIANT").length;
  const count = (st: string) => obligations.filter((o) => o.status === st).length;
  const score = readiness(obligations);
  const latestDocs = DOCUMENT_KINDS.map((k) => ({ def: k, doc: documents.find((d) => d.kind === k.kind) })).filter((x) => x.doc);

  return (
    <>
      <PageHeader
        crumb={`${client.name} · Overview`}
        title="Overview"
        subtitle="Where the company stands: the laws that apply, its AI systems by risk, compliance progress, the actions to take next and the documents issued."
      />
      <div className="space-y-6 p-8">
        {updates.length > 0 && <UpdatesPanel updates={updates} seenAt={seenAt} back={`${base}/overview`} />}

        {/* ── Key figures ─────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card href={`${base}/gap-assessment`} label="Compliance score">
            <div className="flex items-center gap-4">
              <Ring percent={score} />
              <p className="text-[12.5px] leading-relaxed text-muted">
                Share of applicable obligations met: compliant counts in full, partial counts half.
              </p>
            </div>
          </Card>
          <Card href={`${base}/gap-assessment`} label="Obligations met">
            <p className="font-display text-[34px] font-semibold leading-none text-ink">
              {met}
              <span className="text-[20px] text-label"> / {obligations.length}</span>
            </p>
            <p className="mt-2 text-[12.5px] text-muted">
              {count("PARTIAL")} partial · {count("GAP")} gap · {count("NOT_ASSESSED")} not assessed
            </p>
          </Card>
          <Card href={`${base}/inventory`} label="AI systems">
            <p className="font-display text-[34px] font-semibold leading-none text-ink">{total}</p>
            <p className="mt-2 text-[12.5px] text-muted">
              {classified} classified{awaitingReview ? ` · ${awaitingReview} awaiting review` : ""}
            </p>
          </Card>
          <Card href={`${base}/roadmap`} label="Urgent actions" dark={urgent.length > 0}>
            <p className={`font-display text-[34px] font-semibold leading-none ${urgent.length ? "text-rail-text" : "text-ink"}`}>{urgent.length}</p>
            <p className={`mt-2 text-[12.5px] ${urgent.length ? "text-rail-muted" : "text-muted"}`}>
              of {actions.length} open action{actions.length === 1 ? "" : "s"}
            </p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* ── Applicable laws ───────────────────────────────────── */}
          <Panel title="Applicable laws" href={`${base}/applicability`} linkLabel="Applicability check">
            {findings.length === 0 ? (
              <p className="text-[13px] text-muted">No regulation applies on the current answers.</p>
            ) : (
              <ul className="divide-y divide-hairline-light">
                {findings.map((f) => (
                  <li key={f.regulation} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{f.name}</span>
                      <span className="block text-[12px] text-muted">
                        {f.coveredInThisVersion ? "Managed in the Hub" : f.servicesAvailable ? "Not in the Hub yet · SenecAI can help" : "Not covered by the Hub"}
                      </span>
                    </span>
                    <Tag tone={f.coveredInThisVersion ? "gold-fill" : "outline"}>{APPLIES[f.applies]}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* ── AI systems by risk ────────────────────────────────── */}
          <Panel title="EU AI Act: systems by risk class" href={`${base}/inventory`} linkLabel="AI inventory">
            {total === 0 ? (
              <p className="text-[13px] text-muted">No AI systems recorded yet.</p>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-hairline-light">
                  {[...RISK_ORDER, "NONE"].map((r) =>
                    byRisk(r) ? <span key={r} className={RISK_BAR[r]} style={{ width: `${(byRisk(r) / total) * 100}%` }} /> : null,
                  )}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {[...RISK_ORDER, "NONE"].map((r) => (
                    <li key={r} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex items-center gap-2 text-body">
                        <span className={`size-2.5 rounded-sm ${RISK_BAR[r]}`} />
                        {r === "NONE" ? "Not classified" : r === "PROHIBITED" ? "Possibly prohibited" : RISK_LABEL[r]}
                      </span>
                      <span className="font-mono text-[12.5px] tabular-nums text-ink">
                        {byRisk(r)} / {total}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* ── Urgent actions ────────────────────────────────────── */}
          <Panel title="Urgent actions" href={`${base}/roadmap`} linkLabel="Compliance roadmap">
            {urgent.length === 0 ? (
              <p className="text-[13px] text-muted">
                {actions.length ? "Nothing due in the next 30 days or applying within six months." : "No open actions."}
              </p>
            ) : (
              <ul className="divide-y divide-hairline-light">
                {urgent.map(({ a, overdue, article }) => (
                  <li key={a.id}>
                    <Link href={`${base}/roadmap#${a.id}`} className="flex items-start justify-between gap-4 py-2.5 hover:bg-row-hover">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{a.title}</span>
                        <span className="block text-[12px] text-muted">
                          {a.systemObligation.system?.name ?? "Company-wide"} · <span className="font-mono">{article}</span> · {ACTION_STATUS_LABEL[a.status]}
                        </span>
                      </span>
                      <span className={`shrink-0 text-right text-[12px] ${overdue ? "font-semibold text-[#7a1f12]" : "text-label"}`}>
                        {a.dueDate ? `${overdue ? "Overdue · " : "Due "}${formatDate(a.dueDate)}` : `Applies ${formatDate(a.systemObligation.appliesFrom)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* ── Documents ─────────────────────────────────────────── */}
          <Panel title="Documents" href={`${base}/documents`} linkLabel="All documents">
            {latestDocs.length === 0 ? (
              <p className="text-[13px] text-muted">{ctx.role === "COMPANY_USER" ? "No documents released to you yet." : "No documents generated yet."}</p>
            ) : (
              <ul className="divide-y divide-hairline-light">
                {latestDocs.map(({ def, doc }) => (
                  <li key={def.kind} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{def.title}</span>
                      <span className="block text-[12px] text-muted">
                        v{doc!.version} · {formatDate(doc!.releasedAt ?? doc!.approvedAt ?? doc!.createdAt)}
                        {doc!.outdated ? " · outdated" : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <Tag tone={doc!.state === "RELEASED" ? "gold-fill" : doc!.state === "APPROVED" ? "outline" : "muted"}>{STATE_LABEL[doc!.state]}</Tag>
                      <a href={`${base}/documents/${doc!.id}/pdf`} className="text-[12.5px] font-semibold text-gold-hover hover:underline">
                        PDF
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Card({ label, href, dark, children }: { label: string; href: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-5 shadow-sm transition-colors ${dark ? "border-ink bg-ink hover:bg-ink-hover" : "border-hairline bg-surface hover:border-gold"}`}
    >
      <p className={`mb-3 font-mono text-[11px] font-medium uppercase tracking-micro-wide ${dark ? "text-gold-light" : "text-gold"}`}>{label}</p>
      {children}
    </Link>
  );
}

function Panel({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
        <Link href={href} className="shrink-0 text-[12.5px] font-semibold text-gold-hover hover:underline">
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

/** Compliance score as a ring; "—" until anything has been assessed. */
function Ring({ percent }: { percent: number | null }) {
  const p = percent ?? 0;
  return (
    <div
      className="grid size-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--color-gold) ${p * 3.6}deg, var(--color-hairline-light) 0)` }}
      role="img"
      aria-label={percent === null ? "Not yet assessed" : `${percent}% compliant`}
    >
      <span className="grid size-[60px] place-items-center rounded-full bg-surface font-display text-[17px] font-semibold text-ink">
        {percent === null ? "—" : `${percent}%`}
      </span>
    </div>
  );
}
