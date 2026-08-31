export function OptionRow({
  label,
  help,
  citation,
  selected,
  multi,
  onClick,
}: {
  label: string;
  help?: string;
  citation?: string;
  selected: boolean;
  /** true = checklist/signalChecklist (✓ square), false = boolean yes/no (● square) */
  multi: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${
        selected ? "bg-gold-tint" : "bg-white hover:bg-row-hover"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-ink text-[12px] font-bold ${
          selected ? "bg-ink text-white" : "bg-white text-transparent"
        }`}
      >
        {multi ? "✓" : "●"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {help && <span className="mt-0.5 block text-[11.5px] text-muted">{help}</span>}
      </span>
      {citation && (
        <span className="shrink-0 font-narrow text-[11px] tracking-citation text-gold-hover">{citation}</span>
      )}
    </button>
  );
}
