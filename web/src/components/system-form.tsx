import type { AiSystem } from "@/generated/prisma/client";
import type { Question } from "@/lib/content/types";
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

/** A labelled group of tick boxes (a label cannot wrap several inputs). */
function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="block">
      <legend className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">{label}</legend>
      {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </fieldset>
  );
}

/** Tick boxes from the content library's fact questions; the classification reads them (step 2). */
function Ticks({ question, name, checked }: { question: Question; name: string; checked: string[] }) {
  return (
    <span className="flex flex-wrap gap-2">
      {question.options!.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12.5px] text-body transition-colors hover:border-gold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-panel"
        >
          <input type="checkbox" name={name} value={o.id} defaultChecked={checked.includes(o.id)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </span>
  );
}

export type FactQuestions = { areas: Question; affectedGroups: Question; capabilities: Question };

/** Inventory record fields (spec §4, step 1), shared by "add" and "edit". */
export function SystemForm({
  action,
  system,
  submitLabel,
  cancelHref,
  facts,
  suggestedAreas = [],
}: {
  action: (form: FormData) => void | Promise<void>;
  system?: AiSystem;
  submitLabel: string;
  cancelHref: string;
  facts: FactQuestions;
  /** Pre-ticked areas for a new system, from the client's sector. */
  suggestedAreas?: string[];
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
        <Field label="Use" hint="Together with the origin, this decides the company's role (provider or deployer).">
          <Choice name="useType" options={USE_TYPE_LABEL} value={system?.useType} />
        </Field>
        <Field label="People affected (optional)" hint="Who the system's output is about, and roughly how many.">
          <input name="affectedPersons" defaultValue={system?.affectedPersons ?? ""} className={input} />
        </Field>
      </section>

      <section className="space-y-5 rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Where and on whom it is used</h2>
          <p className="text-[12.5px] text-muted">The classification reads these and does not ask them again. Tick all that apply.</p>
        </div>
        <Group label="Area of use" hint={system ? undefined : suggestedAreas.length ? "Pre-filled from the client's sector." : undefined}>
          <Ticks question={facts.areas} name="areas" checked={system?.areas ?? suggestedAreas} />
        </Group>
        <Group label="Who uses it or is affected by it">
          <Ticks question={facts.affectedGroups} name="affectedGroups" checked={system?.affectedGroups ?? []} />
        </Group>
        <Group label="What the system does">
          <Ticks question={facts.capabilities} name="capabilities" checked={system?.capabilities ?? []} />
          <label className="mt-3 block">
            <span className="block text-[12px] text-muted">If you ticked &ldquo;Something else&rdquo;, describe it</span>
            <input
              name="capabilitiesOther"
              defaultValue={system?.capabilitiesOther ?? ""}
              maxLength={300}
              placeholder="e.g. optimises delivery routes, translates documents"
              className={`mt-1.5 ${input}`}
            />
          </label>
        </Group>
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
