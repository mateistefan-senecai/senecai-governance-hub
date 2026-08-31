/**
 * Data-driven, not a fixed step count: the real trees branch conditionally
 * (e.g. the risk tree's annex-iii node skips practical-rights on one path),
 * so the rail shows one cell per node actually visited rather than a
 * hardcoded "N equal cells" header.
 */
export function StepRail({ answeredCount, done }: { answeredCount: number; done: boolean }) {
  const cellCount = answeredCount + 1;
  const cells = Array.from({ length: cellCount }, (_, i) => {
    const isLast = i === cellCount - 1;
    return isLast && done ? "Result" : `Step ${i + 1}`;
  });

  return (
    <div className="grid border-b border-hairline" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
      {cells.map((label, i) => {
        const active = i === cells.length - 1;
        return (
          <div
            key={i}
            className={`border-r border-hairline px-3 py-2 text-center font-narrow text-[10.5px] font-semibold uppercase last:border-r-0 ${
              active ? "bg-gold-tint text-gold-deep" : "text-label"
            }`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
