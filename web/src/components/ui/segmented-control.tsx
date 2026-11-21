"use client";

/** Pure client-side visual toggle — no server write (e.g. the inventory layout A/B switch). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-xl bg-ink/[0.06] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            opt.value === value ? "bg-ink text-rail-text shadow-sm" : "bg-transparent text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
