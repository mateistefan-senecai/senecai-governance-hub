export function StubScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8">
      <div className="max-w-[760px] rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
          Out of scope for this pass
        </p>
        <h2 className="mt-1.5 text-[22px] font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-body">{description}</p>
      </div>
    </div>
  );
}
