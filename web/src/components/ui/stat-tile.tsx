export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
