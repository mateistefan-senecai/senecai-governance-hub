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
      className={`border-2 border-ink ${surface === "panel" ? "bg-panel" : "bg-surface"} ${padded ? "p-5" : ""} ${className}`}
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
    <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-5 py-3">
      <div>
        {kicker && (
          <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
            {kicker}
          </p>
        )}
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
