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
    <div className="inline-flex border-2 border-ink">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[12.5px] font-semibold ${
            opt.value === value ? "bg-ink text-panel" : "bg-transparent text-ink hover:bg-gold-tint"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
