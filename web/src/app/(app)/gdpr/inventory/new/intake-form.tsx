"use client";

import { useState } from "react";
import { createProcessingActivity } from "@/lib/actions/processing-activities";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Identification & purpose" },
  { label: "Data handling" },
  { label: "Ownership & stage" },
] as const;

function Field({
  label,
  name,
  help,
  step,
  activeStep,
}: {
  label: string;
  name: string;
  help?: string;
  step: number;
  activeStep: number;
}) {
  return (
    <div hidden={step !== activeStep}>
      <label htmlFor={name} className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        className="mt-1.5 block w-full rounded-lg border border-hairline px-2.5 py-2 text-[13px] text-ink"
      />
      {help && <p className="mt-1 text-[11px] text-muted">{help}</p>}
    </div>
  );
}

function TextArea({
  label,
  name,
  help,
  step,
  activeStep,
}: {
  label: string;
  name: string;
  help?: string;
  step: number;
  activeStep: number;
}) {
  return (
    <div hidden={step !== activeStep}>
      <label htmlFor={name} className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        className="mt-1.5 block w-full rounded-lg border border-hairline px-2.5 py-2 text-[13px] text-ink"
      />
      {help && <p className="mt-1 text-[11px] text-muted">{help}</p>}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  help,
  step,
  activeStep,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  help?: string;
  step: number;
  activeStep: number;
}) {
  return (
    <div hidden={step !== activeStep}>
      <label htmlFor={name} className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <p className="mt-1 text-[11px] text-muted">{help}</p>}
    </div>
  );
}

export function IntakeForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  const [activeStep, setActiveStep] = useState(0);
  const showOrgPicker = orgs.length > 1;

  return (
    <div className="mx-auto max-w-[1040px] overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
      <div className="grid grid-cols-3 border-b border-hairline">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setActiveStep(i)}
            className={`border-r border-hairline px-4 py-3 text-left transition-colors last:border-r-0 ${
              i === activeStep ? "bg-ink text-panel" : "bg-surface text-ink hover:bg-row-hover"
            }`}
          >
            <span
              className={`block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide ${
                i === activeStep ? "text-gold-light" : "text-label"
              }`}
            >
              Step {i + 1}
            </span>
            <span className="mt-0.5 block text-[13.5px] font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      <form action={createProcessingActivity} className="p-6">
        {showOrgPicker ? (
          <div className="mb-5">
            <label htmlFor="organizationId" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Client organization
            </label>
            <select
              id="organizationId"
              name="organizationId"
              required
              className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="organizationId" value={orgs[0]?.id} />
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-[22px]">
          <Field
            label="1. Activity name"
            name="name"
            help="E.g. 'Employee payroll', 'Marketing newsletter', 'Customer support tickets'."
            step={0}
            activeStep={activeStep}
          />
          <Field
            label="2. Business function"
            name="businessFunction"
            help="E.g. HR, Marketing, Customer Support."
            step={0}
            activeStep={activeStep}
          />
          <TextArea label="3. Description" name="description" help="What this activity does, in a sentence or two." step={0} activeStep={activeStep} />
          <TextArea
            label="4. Purpose of processing"
            name="purposeOfProcessing"
            help="Why this personal data is processed."
            step={0}
            activeStep={activeStep}
          />

          <TextArea
            label="5. Data subject categories"
            name="dataSubjectCategories"
            help="Whose data: employees, customers, job applicants, website visitors..."
            step={1}
            activeStep={activeStep}
          />
          <TextArea
            label="6. Data categories"
            name="dataCategories"
            help="What data: names, emails, health data, financial data..."
            step={1}
            activeStep={activeStep}
          />
          <TextArea
            label="7. Recipients"
            name="recipients"
            help="Who this data is shared with, if anyone."
            step={1}
            activeStep={activeStep}
          />
          <Field label="8. Retention period" name="retentionPeriod" help="E.g. '7 years after contract end'." step={1} activeStep={activeStep} />
          <TextArea
            label="9. Security measures"
            name="securityMeasures"
            help="Art. 32 technical & organizational measures specific to this activity."
            step={1}
            activeStep={activeStep}
          />

          <Field label="10. Compliance owner — name" name="complianceOwnerName" step={2} activeStep={activeStep} />
          <Field label="10. Compliance owner — role" name="complianceOwnerRole" step={2} activeStep={activeStep} />
          <Select
            label="11. Implementation stage"
            name="implementationStage"
            step={2}
            activeStep={activeStep}
            options={[
              { value: "PRODUCTION", label: "In production" },
              { value: "PILOT", label: "Piloting" },
              { value: "PLANNED", label: "Planned" },
            ]}
          />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
          <p className="max-w-[50ch] text-[11.5px] text-muted">
            Role and characteristics aren&rsquo;t collected here — set them on the activity&rsquo;s own record once
            it&rsquo;s created.
          </p>
          {activeStep < STEPS.length - 1 ? (
            <Button type="button" variant="ghost" onClick={() => setActiveStep((s) => s + 1)}>
              Next →
            </Button>
          ) : (
            <Button type="submit" variant="primary">
              Save & classify →
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
