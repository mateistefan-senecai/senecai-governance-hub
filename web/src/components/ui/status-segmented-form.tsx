/**
 * Server-renderable status control: one tiny <form> per option, each bound
 * to the same server action, submitting just that option's status value.
 * Keeps progressive-enhancement/no-JS submission consistent with the rest
 * of the app's form-action pattern instead of a controlled radio group.
 */
export function StatusSegmentedForm({
  action,
  hiddenFields,
  activeValue,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  activeValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-hairline bg-hairline-light p-1">
      {options.map((opt) => (
        <form key={opt.value} action={action}>
          {Object.entries(hiddenFields).map(([name, val]) => (
            <input key={name} type="hidden" name={name} value={val} />
          ))}
          <input type="hidden" name="status" value={opt.value} />
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 font-narrow text-[11px] font-semibold uppercase tracking-tag transition-colors ${
              opt.value === activeValue ? "bg-ink text-panel shadow-sm" : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        </form>
      ))}
    </div>
  );
}
