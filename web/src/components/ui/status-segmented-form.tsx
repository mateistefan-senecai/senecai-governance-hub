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
    <div className="inline-flex border-[1.5px] border-ink">
      {options.map((opt) => (
        <form key={opt.value} action={action}>
          {Object.entries(hiddenFields).map(([name, val]) => (
            <input key={name} type="hidden" name={name} value={val} />
          ))}
          <input type="hidden" name="status" value={opt.value} />
          <button
            type="submit"
            className={`px-3 py-1.5 font-narrow text-[11px] font-semibold uppercase tracking-tag ${
              opt.value === activeValue ? "bg-ink text-panel" : "bg-transparent text-ink hover:bg-gold-tint"
            }`}
          >
            {opt.label}
          </button>
        </form>
      ))}
    </div>
  );
}
