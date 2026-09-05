import { getOrCreateDpia, updateDpia } from "@/lib/actions/dpia";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { Tag } from "@/components/ui/tag";
import { StubActionButton } from "@/components/ui/stub-action-button";

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-surface px-5 py-[13px]">
      <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value ?? <span className="text-disabled">—</span>}</p>
    </div>
  );
}

function TextArea({
  label,
  name,
  help,
  defaultValue,
}: {
  label: string;
  name: string;
  help?: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        className="mt-1.5 block w-full rounded-lg border border-hairline px-2.5 py-2 text-[13px] text-ink"
      />
      {help && <p className="mt-1 text-[11px] text-muted">{help}</p>}
    </div>
  );
}

export default async function DpiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const { activity, dpia } = await getOrCreateDpia(id);

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="GDPR / Data Protection Impact Assessment"
        title={activity.name}
        subtitle="Art. 35 DPIA — required because this activity's characteristics trigger a high-risk processing trigger."
        actions={
          <Button variant="ghost" href={`/gdpr/compliance-plan/${activity.id}/obligations`}>
            ← Obligations
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <div className="border-b border-hairline px-5 py-3">
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                Step 1 — processing description
              </p>
              <h2 className="text-base font-semibold text-ink">Pulled from Processing Inventory</h2>
            </div>
            <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2">
              <ReadOnlyField label="Description" value={activity.description} />
              <ReadOnlyField label="Purpose of processing" value={activity.purposeOfProcessing} />
              <ReadOnlyField label="Data subject categories" value={activity.dataSubjectCategories} />
              <ReadOnlyField label="Data categories" value={activity.dataCategories} />
              <ReadOnlyField label="Recipients" value={activity.recipients} />
              <ReadOnlyField label="Retention period" value={activity.retentionPeriod} />
              <ReadOnlyField label="Security measures" value={activity.securityMeasures} />
            </div>
          </div>

          <form action={updateDpia} className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <input type="hidden" name="processingActivityId" value={activity.id} />
            <div className="border-b border-hairline px-5 py-3">
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                Steps 2–6 — assessment
              </p>
              <h2 className="text-base font-semibold text-ink">Necessity, risk, mitigation & sign-off</h2>
            </div>

            <div className="space-y-5 px-5 py-5">
              <TextArea
                label="2. Necessity & proportionality"
                name="necessityProportionality"
                help="Why this processing is necessary and proportionate to its stated purpose."
                defaultValue={dpia.necessityProportionality}
              />
              <TextArea
                label="3. Risk identification"
                name="risksIdentified"
                help="Risks to data subjects' rights and freedoms this processing creates."
                defaultValue={dpia.risksIdentified}
              />
              <TextArea
                label="4. Mitigation measures"
                name="mitigationMeasures"
                help="Measures taken to address the risks identified above."
                defaultValue={dpia.mitigationMeasures}
              />

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-hairline pt-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="dpoSignOffName" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                    5. DPO sign-off — name
                  </label>
                  <input
                    id="dpoSignOffName"
                    name="dpoSignOffName"
                    type="text"
                    defaultValue={dpia.dpoSignOffName ?? ""}
                    className="mt-1.5 block w-full rounded-lg border border-hairline px-2.5 py-2 text-[13px] text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="dpoSignOffDate" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                    5. DPO sign-off — date
                  </label>
                  <input
                    id="dpoSignOffDate"
                    name="dpoSignOffDate"
                    type="date"
                    defaultValue={dpia.dpoSignOffDate ? dpia.dpoSignOffDate.toISOString().slice(0, 10) : ""}
                    className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
                  />
                </div>
              </div>

              <div className="border-t border-hairline pt-5">
                <label htmlFor="outcome" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  6. Outcome
                </label>
                <select
                  id="outcome"
                  name="outcome"
                  defaultValue={dpia.outcome ?? ""}
                  className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
                >
                  <option value="">Not yet determined</option>
                  <option value="RESIDUAL_RISK_ACCEPTABLE">Residual risk acceptable</option>
                  <option value="FLAGGED_FOR_AUTHORITY_CONSULTATION">Flagged for authority consultation</option>
                </select>
                <div className="mt-3">
                  <TextArea
                    label="Outcome note"
                    name="outcomeNote"
                    help="Reasoning behind the outcome above, for the record."
                    defaultValue={dpia.outcomeNote}
                  />
                </div>
              </div>

              <div className="border-t border-hairline pt-5">
                <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  Art. 36 — authority consultation follow-through
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Only relevant if the outcome above is &ldquo;Flagged for authority consultation&rdquo; — a flag with
                  no follow-through recorded is otherwise a dead end.
                </p>
                <div className="mt-3">
                  <label
                    htmlFor="authorityConsultationDate"
                    className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label"
                  >
                    Consultation submitted — date
                  </label>
                  <input
                    id="authorityConsultationDate"
                    name="authorityConsultationDate"
                    type="date"
                    defaultValue={
                      dpia.authorityConsultationDate ? dpia.authorityConsultationDate.toISOString().slice(0, 10) : ""
                    }
                    className="mt-1.5 block w-full max-w-xs rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
                  />
                </div>
                <div className="mt-3">
                  <TextArea
                    label="Consultation outcome"
                    name="authorityConsultationOutcome"
                    help="The supervisory authority's response, or the current status while awaiting one."
                    defaultValue={dpia.authorityConsultationOutcome}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hairline px-5 py-4">
              <p className="max-w-[50ch] text-[11.5px] text-muted">
                Saving updates this obligation&rsquo;s status on the Gap Assessment automatically.
              </p>
              <Button type="submit" variant="primary">
                Save DPIA →
              </Button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-hairline bg-surface p-4 shadow-sm lg:sticky lg:top-5">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Status</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dpia.outcome === "FLAGGED_FOR_AUTHORITY_CONSULTATION" ? (
                <>
                  <Tag tone="gold-fill">Flagged for authority consultation</Tag>
                  {!dpia.authorityConsultationOutcome && <Tag tone="muted">Follow-through not recorded</Tag>}
                </>
              ) : dpia.outcome ? (
                <Tag tone="ink-fill">Outcome recorded</Tag>
              ) : dpia.necessityProportionality || dpia.risksIdentified || dpia.mitigationMeasures ? (
                <Tag tone="outline">In progress</Tag>
              ) : (
                <Tag tone="muted">Not started</Tag>
              )}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              This rolls up into the &ldquo;Art. 35 — DPIA&rdquo; obligation on the Gap Assessment step; no separate
              status needs to be set there.
            </p>
          </div>

          <PanelHeading title="Step 7 — report" kicker="Feature 2.2" />
          <div className="rounded-xl border border-hairline bg-surface p-4 shadow-sm">
            <p className="text-[12.5px] leading-relaxed text-body">
              Generate a DPIA report from the fields above for consultant review before delivery to the client.
            </p>
            <StubActionButton
              label="Generate DPIA report"
              notice="A DPIA report draft has been generated from this record."
              variant="primary"
              className="mt-3 w-full justify-start"
            />
          </div>
        </div>
      </div>
    </>
  );
}
