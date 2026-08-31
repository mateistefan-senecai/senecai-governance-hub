const HEIGHT_CLASS = {
  xs: "h-1",
  sm: "h-2",
  md: "h-2.5",
  lg: "h-3.5",
} as const;

export function ProgressBar({
  percent,
  height = "sm",
  showLabel = false,
}: {
  percent: number | null;
  height?: keyof typeof HEIGHT_CLASS;
  showLabel?: boolean;
}) {
  const pct = percent ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-hairline-light ${HEIGHT_CLASS[height]}`}>
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink">
          {percent === null ? "—" : `${percent}%`}
        </span>
      )}
    </div>
  );
}
