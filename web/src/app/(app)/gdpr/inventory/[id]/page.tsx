import { auth } from "@/lib/auth";
import { getProcessingActivity, updateProcessingActivityClassification } from "@/lib/actions/processing-activities";
import { getApplicableGdprObligations } from "@/lib/gdpr-obligations";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { Tag } from "@/components/ui/tag";
import type { GdprCharacteristic } from "@/generated/prisma/enums";

const CHARACTERISTIC_OPTIONS: { value: GdprCharacteristic; label: string }[] = [
  { value: "SPECIAL_CATEGORY_DATA", label: "Special category data (health, biometric, religious, etc.)" },
  { value: "LARGE_SCALE", label: "Large-scale processing" },
  { value: "SYSTEMATIC_MONITORING", label: "Systematic monitoring (incl. of publicly accessible areas)" },
  { value: "AUTOMATED_DECISION_MAKING", label: "Automated decision-making / profiling with legal or similarly significant effect" },
  { value: "CHILDRENS_DATA", label: "Children's data" },
  { value: "CROSS_BORDER_TRANSFER", label: "Cross-border / third-country transfer" },
  { value: "USES_PROCESSOR", label: "Uses a processor / sub-processor" },
];

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-surface px-5 py-[13px]">
      <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value ?? <span className="text-disabled">—</span>}</p>
    </div>
  );
}

export default async function ProcessingActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  await auth();
  const activity = await getProcessingActivity(id);
  const applicableObligations = getApplicableGdprObligations(activity);

  const dpiaTriggers = getApplicableGdprObligations(activity).some((o) => o.id === "tied.art35-dpia");
  const complianceOwner =
    [activity.complianceOwnerName, activity.complianceOwnerRole].filter(Boolean).join(" — ") || null;

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb={activity.organization.name}
        title={activity.name}
        actions={<Button variant="ghost" href="/gdpr/inventory">← Processing Inventory</Button>}
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] lg:items-start">
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <div>
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                Feature 1.1 — ROPA record
              </p>
              <h2 className="text-base font-semibold text-ink">Record</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2">
            <Field label="Description" value={activity.description} />
            <Field label="Business function" value={activity.businessFunction} />
            <Field label="Purpose of processing" value={activity.purposeOfProcessing} />
            <Field label="Data subject categories" value={activity.dataSubjectCategories} />
            <Field label="Data categories" value={activity.dataCategories} />
            <Field label="Recipients" value={activity.recipients} />
            <Field label="Retention period" value={activity.retentionPeriod} />
            <Field label="Security measures" value={activity.securityMeasures} />
            <Field label="Compliance owner" value={complianceOwner} />
            <Field label="Implementation stage" value={activity.implementationStage} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-hairline bg-surface p-4 shadow-sm">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Feature 1.2 — classification
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Self-reported directly — no decision tree behind this, unlike the AI Act module.
            </p>

            <form action={updateProcessingActivityClassification} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={activity.id} />

              <div>
                <label htmlFor="role" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue={activity.role ?? ""}
                  className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
                >
                  <option value="">Not classified</option>
                  <option value="CONTROLLER">Controller</option>
                  <option value="PROCESSOR">Processor</option>
                  <option value="JOINT_CONTROLLER">Joint Controller</option>
                </select>
              </div>

              <div>
                <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                  Characteristics
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {CHARACTERISTIC_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-2 text-[12px] text-body">
                      <input
                        type="checkbox"
                        name="characteristics"
                        value={opt.value}
                        defaultChecked={activity.characteristics.includes(opt.value)}
                        className="mt-0.5"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full justify-start">
                Save classification →
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-hairline bg-panel p-4 shadow-sm">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Next step
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              {activity.role
                ? `This classification maps ${applicableObligations.length} obligation${applicableObligations.length === 1 ? "" : "s"}.`
                : "Set a role and characteristics above to see the obligations that apply to this activity."}
            </p>
            <Button
              variant="ghost"
              href={`/gdpr/compliance-plan/${activity.id}/obligations`}
              className="mt-3 w-full justify-start"
            >
              Obligations →
            </Button>
            {dpiaTriggers && (
              <>
                <div className="mt-2">
                  <Tag tone="gold-fill">DPIA required</Tag>
                </div>
                <Button
                  variant="ghost"
                  href={`/gdpr/compliance-plan/${activity.id}/dpia`}
                  className="mt-2 w-full justify-start"
                >
                  Open DPIA →
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
