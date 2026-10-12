import type { ReactNode } from "react";

export function Citation({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1.5 inline-block rounded border border-hairline px-1.5 py-px font-narrow text-[10.5px] font-semibold tracking-citation text-gold-deep">
      {children}
    </span>
  );
}
