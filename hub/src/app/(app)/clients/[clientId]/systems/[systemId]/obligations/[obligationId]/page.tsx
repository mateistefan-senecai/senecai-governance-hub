import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canReview, requireSystem } from "@/lib/authz";
import { getContentVersion } from "@/lib/content/current";
import { resolveDateKey } from "@/lib/content/engine";
import { assessObligationAction, setObligationOwner } from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Citation } from "@/components/ui/citation";
import {
  ACTION_STATUS_LABEL,
  EFFORT_LABEL,
  OBLIGATION_STATUS_LABEL,
  OBLIGATION_STATUS_TONE,
  ROLE_LABEL,
  formatDate,
} from "@/lib/labels";
import type { Outputs } from "@/lib/content/types";

/**
 * One obligation on one system, laid out as the six linked parts of the
 * obligation-to-evidence engine (spec §5): how the company knows it is met,
 * from the legal basis to the evidence to the reviewer's reasoning.
 */
export default async function ObligationPage({
  params,
}: PageProps<"/clients/[clientId]/systems/[systemId]/obligations/[obligationId]">) {
  const { clientId, systemId, obligationId } = await params;
  const ctx = await getCtx();
  const data = await withTenant(ctx, async (tx) => {
    const { system } = await requireSystem(tx, ctx, clientId, systemId);
    const so = await tx.systemObligation.findFirst({ where: { id: obligationId, systemId }, include: { actions: true } });
    if (!so) notFound();
    const bundle = await getContentVersion(tx, so.contentVersion);
    const current = await tx.classification.findFirst({ where: { systemId, isCurrent: true } });
    const assessor = so.assessedById ? await tx.user.findUnique({ where: { id: so.assessedById } }) : null;
    return { system, so, bundle, current, assessor };
  });
  const { system, so, bundle, current, assessor } = data;
  const def = bundle.obligations.find((o) => o.key === so.obligationKey);
  if (!def) notFound();
  const action = so.actions[0];
  const dateDef = bundle.dates[resolveDateKey(def.appliesFrom, (current?.effective as Outputs | undefined) ?? {})];
  const isReviewer = canReview(ctx);
  const systemHref = `/clients/${clientId}/systems/${systemId}`;

  return (
    <>
      <PageHeader
        crumb={`${def.article} · ${system.name}`}
        title={def.title}
        actions={<Button href={systemHref}>← {system.name}</Button>}
      />
      {!so.active && (
        <div className="border-b border-hairline bg-panel px-8 py-3 text-[13px] text-muted">
          After the latest classification this obligation no longer applies to the system. Its record is kept for history.
        </div>
      )}
      {so.needsReassessment && (
        <div className="border-b border-hairline bg-gold-tint px-8 py-3 text-[13px] text-gold-deep">
          The system or its classification changed after this obligation was assessed. Review the assessment again.
        </div>
      )}

      <div className="grid max-w-6xl gap-5 p-8 lg:grid-cols-2">
        <Part n={1} title="Legal basis and why it applies">
          <p className="text-[13.5px] leading-relaxed text-body">{def.summary}</p>
          <p className="mt-3 text-[13px] text-ink">
            <span className="font-semibold">Why it applies here: </span>
            {so.rationale}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <Citation>{def.article}</Citation>
            <span>
              Applies from <strong className="text-ink">{formatDate(so.appliesFrom)}</strong>
              {dateDef && ` (${dateDef.provision})`}
            </span>
          </div>
          {dateDef?.note && <p className="mt-2 text-[12px] leading-relaxed text-gold-deep">{dateDef.note}</p>}
          <p className="mt-3 text-[11.5px] text-label">Legal content {so.contentVersion}</p>
        </Part>

        <Part n={2} title="Responsible party and accountable owner">
          <p className="text-[13.5px] text-ink">
            The company carries this duty as{" "}
            <strong>{so.party.split(" & ").map((p) => ROLE_LABEL[p] ?? p).join(" and ").toLowerCase()}</strong>.
          </p>
          <form action={setObligationOwner.bind(null, clientId, systemId, so.id)} className="mt-3 flex gap-2">
            <label htmlFor="ownerName" className="sr-only">
              Accountable owner
            </label>
            <input
              id="ownerName"
              name="ownerName"
              defaultValue={so.ownerName ?? ""}
              placeholder={`Accountable person, e.g. ${system.ownerName}`}
              className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-[13px]"
            />
            <Button size="sm">Save owner</Button>
          </form>
        </Part>

        <Part n={3} title="Evidence required">
          <p className="mb-2 text-[12.5px] text-muted">What would show that this obligation is implemented:</p>
          <ul className="space-y-1.5">
            {def.evidenceExpected.map((e) => (
              <li key={e} className="flex gap-2 text-[13px] text-ink">
                <span className="text-gold">▪</span>
                {e}
              </li>
            ))}
          </ul>
        </Part>

        <Part n={4} title="Evidence provided" muted>
          <p className="text-[13px] leading-relaxed text-muted">
            The evidence repository arrives in Stage 2: files will be uploaded or linked here against each expected item, rated by a reviewer,
            and vendor documents will link in automatically. Until then the assessment rests on the interview and questionnaire answers.
          </p>
        </Part>

        <Part n={5} title="Assessment and reviewer rationale">
          <div className="flex items-center gap-3">
            <Tag tone={OBLIGATION_STATUS_TONE[so.status]}>{OBLIGATION_STATUS_LABEL[so.status]}</Tag>
            {assessor && (
              <span className="text-[12px] text-muted">
                by {assessor.name}, {formatDate(so.assessedAt)}
              </span>
            )}
          </div>
          {so.statusRationale && <p className="mt-2 text-[13px] leading-relaxed text-body">“{so.statusRationale}”</p>}
          {isReviewer && so.active ? (
            <form action={assessObligationAction.bind(null, clientId, systemId, so.id)} className="mt-4 space-y-3 border-t border-hairline pt-4">
              <fieldset className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                <legend className="sr-only">Status</legend>
                {(["COMPLIANT", "PARTIAL", "GAP"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-1.5">
                    <input type="radio" name="status" value={s} required defaultChecked={so.status === s} className="accent-[var(--color-gold)]" />
                    {OBLIGATION_STATUS_LABEL[s]}
                  </label>
                ))}
              </fieldset>
              <label className="block text-[12.5px]">
                <span className="font-semibold text-ink">Rationale</span>
                <span className="block text-muted">Required to mark it compliant. Say what you relied on.</span>
                <textarea
                  name="rationale"
                  rows={3}
                  defaultValue={so.statusRationale ?? ""}
                  className="mt-1 block w-full rounded-md border border-hairline bg-surface px-2 py-1.5 text-[13px]"
                />
              </label>
              <Button variant="primary" size="sm">
                Save assessment
              </Button>
            </form>
          ) : (
            !isReviewer && <p className="mt-3 text-[12px] text-muted">A reviewer assesses each obligation.</p>
          )}
        </Part>

        <Part n={6} title="Corrective action">
          {action ? (
            <div>
              <p className="text-[13.5px] font-medium text-ink">{action.title}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                {action.type === "LEGAL" ? "Legal" : "Technical"} · {EFFORT_LABEL[action.effort]} effort · Phase {action.phase} ·{" "}
                {ACTION_STATUS_LABEL[action.status]}
              </p>
              <Link href={`/clients/${clientId}/roadmap#${action.id}`} className="mt-2 inline-block text-[12.5px] font-semibold text-gold-hover hover:underline">
                Open in the roadmap →
              </Link>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              {so.status === "COMPLIANT"
                ? "None needed: the obligation is met."
                : "An action is created when the obligation is assessed as partial or gap."}
            </p>
          )}
        </Part>
      </div>
    </>
  );
}

function Part({ n, title, children, muted }: { n: number; title: string; children: ReactNode; muted?: boolean }) {
  return (
    <section className={`rounded-xl border border-hairline p-5 shadow-sm ${muted ? "bg-panel" : "bg-surface"}`}>
      <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">{n} of 6</p>
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
