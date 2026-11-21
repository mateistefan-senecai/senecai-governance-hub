import type { ReactNode } from "react";

const TONE_CLASS = {
  outline: "border-hairline text-ink bg-transparent",
  prelim: "border-transparent bg-gold-tint text-gold-deep",
  "gold-fill": "border-transparent bg-gold text-white shadow-sm",
  "ink-fill": "border-transparent bg-ink text-rail-text shadow-sm",
  muted: "border-border-neutral text-label bg-transparent",
} as const;

export type TagTone = keyof typeof TONE_CLASS;

export function Tag({ tone = "outline", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-tag ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
