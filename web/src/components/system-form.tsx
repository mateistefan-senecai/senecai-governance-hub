import type { AiSystem } from "@/generated/prisma/client";
import { AUTONOMY_LABEL, ORIGIN_LABEL, STAGE_LABEL, USE_TYPE_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";

const input = "w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">{label}</span>
      {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Choice({ name, options, value }: { name: string; options: Record<string, string>; value?: string }) {
  return (
    <span className="flex flex-wrap gap-x-5 gap-y-1.5">
      {Object.entries(options).map(([v, label]) => (
        <span key={v} className="flex items-center gap-1.5 text-[13px] text-body">
          <input type="radio" id={`${name}-${v}`} name={name} value={v} defaultChecked={value === v} required className="accent-[var(--color-gold)]" />
          <label htmlFor={`${name}-${v}`}>{label}</label>
        </span>
      ))}
    </span>
  );
}

/** Inventory record fields (spec §4, step 1), shared by "add" and "edit". */
export function SystemForm({
  action,
  system,
  submitLabel,
  cancelHref,
}: {
  action: (form: FormData) => void | Promise<void>;
  system?: AiSystem;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <section className="space-y-4 rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-ink">What it is</h2>
        <Field label="Name">
          <input name="name" required defaultValue={system?.name} className={input} placeholder="e.g. Credit Scoring Engine" />
        </Field>
        <Field label="Intended purpose" hint="What the system is used for, in one or two sentences. This drives the classification.">
          <textarea name="purpose" required rows={2} defaultValue={system?.purpose} className={input} />
        </Field>
        <Field label="How it works (optional)">
          <textarea name="description" rows={2} defaultValue={system?.description ?? ""} className={input} />
        </Field>
        <Field label="Origin">
          <Choice name="origin" options={ORIGIN_LABEL} value={system?.origin} />
        </Field>
        <Field label="Supplier" hint="Required for bought or embedded systems. The vendor register lists what to request from them.">
          <input name="supplier" defaultValue={system?.supplier ?? ""} className={input} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-ink">Who and where</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Accountable owner">
            <input name="ownerName" required defaultValue={system?.ownerName} className={input} placeholder="Full name" />
          </Field>
          <Field label="Owner's role (optional)">
            <input name="ownerRole" defaultValue={system?.ownerRole ?? ""} className={input} placeholder="e.g. Head of Credit Risk" />
          </Field>
        </div>
        <Field label="Where it is deployed" hint="Departments, channels, countries.">
          <input name="deploymentContext" required defaultValue={system?.deploymentContext} className={input} />
        </Field>
        <Field label="Use">
          <Choice name="useType" options={USE_TYPE_LABEL} value={system?.useType} />
        </Field>
        <Field label="People affected (optional)" hint="Who the system's output is about, and roughly how many.">
          <input name="affectedPersons" defaultValue={system?.affectedPersons ?? ""} className={input} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-ink">Data and autonomy</h2>
        <Field label="Data used" hint="Comma-separated, e.g. CVs, transaction data, camera images.">
          <input name="dataCategories" defaultValue={system?.dataCategories.join(", ")} className={input} />
        </Field>
        <Field label="Autonomy">
          <Choice name="autonomy" options={AUTONOMY_LABEL} value={system?.autonomy} />
        </Field>
        <Field label="Stage">
          <Choice name="stage" options={STAGE_LABEL} value={system?.stage} />
        </Field>
      </section>

      <div className="flex gap-2">
        <Button variant="primary">{submitLabel}</Button>
        <Button href={cancelHref}>Cancel</Button>
      </div>
    </form>
  );
}
