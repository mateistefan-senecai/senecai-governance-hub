"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; hint?: string; disabled?: boolean };

/** Client navigation on the dark rail. */
export function ClientNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (item.disabled) {
          return (
            <div key={item.href} className="flex items-start gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] text-rail-muted/80">
              <LockIcon />
              <span>
                {item.label}
                {item.hint && <span className="block text-[11.5px]">{item.hint}</span>}
              </span>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-start gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors ${
              active ? "bg-rail-text text-ink" : "text-rail-text hover:bg-white/5"
            }`}
          >
            <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${active ? "bg-gold" : "bg-rail-muted/50"}`} />
            <span>
              <span className={active ? "font-semibold" : undefined}>{item.label}</span>
              {item.hint && (
                <span className={`block text-[11.5px] ${active ? "text-muted" : "text-rail-muted"}`}>{item.hint}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="mt-0.5 shrink-0">
      <rect x="3" y="6" width="8" height="6" rx="1" fill="none" stroke="currentColor" />
      <path d="M5 6V4a2 2 0 014 0v2" fill="none" stroke="currentColor" />
    </svg>
  );
}
