"use client";

import { useState } from "react";
import { createAiSystem } from "@/lib/actions/ai-systems";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Identification" },
  { label: "Data & operation" },
  { label: "Impact & ownership" },
] as const;

function Field({
  label,
  name,
  help,
  type = "text",
  step,
  activeStep,
}: {
  label: string;
  name: string;
  help?: string;
  type?: string;
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
        type={type}
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

      <form action={createAiSystem} className="p-6">
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
            label="1. System name"
            name="name"
            help="Name of the AI system or platform (e.g. ChatGPT, internal model, third-party platform)."
            step={0}
            activeStep={activeStep}
          />
          <Select
            label="3. Use-case type"
            name="useCaseType"
            step={0}
            activeStep={activeStep}
            options={[
              { value: "PRODUCT", label: "Product (end customers)" },
              { value: "INTERNAL_OPS", label: "Internal operations" },
              { value: "HYBRID", label: "Hybrid" },
            ]}
          />
          <TextArea label="2. System description" name="description" help="Main functionality and how it operates." step={0} activeStep={activeStep} />
          <Field label="4. Business process affected" name="businessProcess" help="E.g. credit scoring, support triage, inventory optimization." step={0} activeStep={activeStep} />

          <TextArea label="5. Input data" name="inputData" help="What data does the system receive as input?" step={1} activeStep={activeStep} />
          <TextArea label="6. Output / decision type" name="outputData" help="Score, recommendation, classification, automated action, alert." step={1} activeStep={activeStep} />
          <TextArea label="7. Data source" name="dataSource" help="Internal databases / third parties / external APIs / user-generated / synthetic." step={1} activeStep={activeStep} />
          <Select
            label="9. Autonomy level"
            name="autonomyLevel"
            step={1}
            activeStep={activeStep}
            options={[
              { value: "FULLY_AUTOMATED", label: "Fully automated" },
              { value: "PARTIALLY_AUTOMATED", label: "Partially automated (human-on-the-loop)" },
              { value: "CONSULTATIVE", label: "Advisory (human-in-the-loop)" },
            ]}
          />

          <TextArea label="8. Human oversight mechanism" name="humanOversightMechanism" help="E.g. manual validation before execution, ability to cancel, periodic audit." step={2} activeStep={activeStep} />
          <TextArea label="11. Decisions influenced & impact" name="decisionsAndImpact" help="What decisions, and the impact of a wrong one." step={2} activeStep={activeStep} />
          <Field label="10. Compliance owner — name" name="complianceOwnerName" step={2} activeStep={activeStep} />
          <Field label="10. Compliance owner — role" name="complianceOwnerRole" step={2} activeStep={activeStep} />
          <Field label="12. Employee user count" name="userCount" type="number" step={2} activeStep={activeStep} />
          <Field label="12. End-customer estimate" name="endCustomerEstimate" help="If it affects end customers, a rough estimate." step={2} activeStep={activeStep} />
          <Select
            label="13. Implementation stage"
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
            14. Risk classification isn&rsquo;t collected here — it&rsquo;s derived by the decision trees once the
            system is created.
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
