import type { ReactNode } from "react";

export function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
}: {
  crumb?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-7 flex-wrap px-8 pb-2 pt-8">
      <div className="min-w-0 flex-1">
        {crumb && (
          <p className="inline-flex rounded-full border border-gold/20 bg-gold/[0.08] px-2.5 py-1 text-[12px] font-medium text-gold">
            {crumb}
          </p>
        )}
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.05] tracking-tighter text-ink">{title}</h1>
        {subtitle && (
          <p className="prose-pretty mt-2.5 max-w-[66ch] text-[14.5px] leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
