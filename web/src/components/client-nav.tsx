"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; hint?: string; disabled?: boolean };

export function ClientNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (item.disabled) {
          return (
            <div key={item.href} className="rounded-lg px-3 py-2 text-[13px] text-disabled">
              {item.label}
              {item.hint && <span className="block text-[11px]">{item.hint}</span>}
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-[13px] transition-colors ${
              active ? "bg-gold-tint font-semibold text-gold-deep shadow-sm" : "text-ink hover:bg-hairline-light"
            }`}
          >
            {item.label}
            {item.hint && <span className="block text-[11px] font-normal text-muted">{item.hint}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
