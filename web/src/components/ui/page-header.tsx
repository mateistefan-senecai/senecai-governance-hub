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
    <header className="flex items-end justify-between gap-7 border-b border-hairline bg-ground px-8 pb-5 pt-6">
      <div className="min-w-0 flex-1">
        {crumb && (
          <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
            {crumb}
          </p>
        )}
        <h1 className="text-[27px] font-semibold leading-[1.15] tracking-tight text-ink">{title}</h1>
        {subtitle && (
          <p className="prose-pretty mt-1 max-w-[66ch] text-[13.5px] leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
