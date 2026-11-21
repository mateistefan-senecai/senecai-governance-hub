import type { ReactNode } from "react";

export function Citation({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1.5 inline-block rounded-md bg-ink/5 px-2 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </span>
  );
}
