import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  padded = true,
  surface = "surface",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  surface?: "surface" | "panel";
}) {
  return (
    <div
      className={`rounded-2xl border border-ink/10 shadow-[0_1px_0_rgb(255_255_255/80%)_inset,0_20px_40px_-24px_rgb(17_13_10/25%)] ${surface === "panel" ? "bg-panel" : "glass"} ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeading({
  title,
  kicker,
  action,
}: {
  title: string;
  kicker?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-3.5">
      <div>
        {kicker && (
          <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
