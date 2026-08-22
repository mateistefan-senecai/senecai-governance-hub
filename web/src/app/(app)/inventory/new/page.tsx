import { createAiSystem, getAccessibleOrganizations } from "@/lib/actions/ai-systems";

function Field({
  label,
  name,
  help,
  type = "text",
}: {
  label: string;
  name: string;
  help?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {help && <p className="text-xs text-slate-500">{help}</p>}
      <input
        id={name}
        name={name}
        type={type}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}

function TextArea({ label, name, help }: { label: string; name: string; help?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {help && <p className="text-xs text-slate-500">{help}</p>}
      <textarea
        id={name}
        name={name}
        rows={2}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  help,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  help?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {help && <p className="text-xs text-slate-500">{help}</p>}
      <select
        id={name}
        name={name}
        defaultValue=""
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default async function NewAiSystemPage() {
  const orgs = await getAccessibleOrganizations();
  const showOrgPicker = orgs.length > 1;

  if (orgs.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900">New AI system</h1>
        <p className="mt-2 text-sm text-slate-600">
          You don&rsquo;t have access to any client organization yet. Ask a SenecAI admin to
          assign you to one before creating an AI system.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900">New AI system</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fields mirror the client-facing intake questionnaire (docs/context/ai-inventory-questionnaire.md).
        Only the system name is required — everything else can be filled in later.
      </p>

      <form action={createAiSystem} className="mt-6 space-y-5">
        {showOrgPicker ? (
          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-slate-700">
              Client organization
            </label>
            <select
              id="organizationId"
              name="organizationId"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="organizationId" value={orgs[0].id} />
        )}

        <Field label="1. System name" name="name" help="Name of the AI system or platform (e.g. ChatGPT, internal model, third-party platform)." />
        <TextArea label="2. Description" name="description" help="Main functionality and how it operates." />
        <Select
          label="3. Use-case type"
          name="useCaseType"
          options={[
            { value: "PRODUCT", label: "Product (used by external customers)" },
            { value: "INTERNAL_OPS", label: "Internal operations" },
            { value: "HYBRID", label: "Hybrid" },
          ]}
        />
        <Field label="4. Business process affected" name="businessProcess" help="E.g. credit scoring, support triage, inventory optimization." />
        <TextArea label="5. Input data" name="inputData" help="What data does the system receive as input?" />
        <TextArea label="6. Output / decision type" name="outputData" help="What does the system produce? (score, recommendation, classification, automated action, alert)" />
        <TextArea label="7. Data source" name="dataSource" help="Internal databases / third parties / external APIs / user-generated / synthetic data." />
        <TextArea label="8. Human oversight mechanism" name="humanOversightMechanism" help="E.g. manual validation before execution, ability to cancel, periodic audit." />
        <Select
          label="9. Autonomy level"
          name="autonomyLevel"
          options={[
            { value: "FULLY_AUTOMATED", label: "Fully automated" },
            { value: "PARTIALLY_AUTOMATED", label: "Partially automated (human-on-the-loop)" },
            { value: "CONSULTATIVE", label: "Consultative (human-in-the-loop)" },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="10. Compliance owner — name" name="complianceOwnerName" />
          <Field label="10. Compliance owner — role" name="complianceOwnerRole" />
        </div>
        <TextArea label="11. Decisions influenced & impact" name="decisionsAndImpact" help="What decisions, and the impact of a wrong one (financial, operational, customer-facing)?" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="12. Number of employee users" name="userCount" type="number" />
          <Field label="12. End-customer estimate" name="endCustomerEstimate" help="If it affects end customers, a rough estimate." />
        </div>
        <Select
          label="13. Implementation stage"
          name="implementationStage"
          options={[
            { value: "PRODUCTION", label: "In production" },
            { value: "PILOT", label: "Piloting" },
            { value: "PLANNED", label: "Planned" },
          ]}
        />

        <p className="text-xs text-slate-500">
          14. Risk classification and role mapping are not entered here — run them from the
          system page once it&rsquo;s created (Module 1.2 / 1.3).
        </p>

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Create AI system
        </button>
      </form>
    </div>
  );
}
