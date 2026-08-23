import type { ReactNode } from "react";

const TONE_CLASS = {
  outline: "border-ink text-ink bg-transparent",
  prelim: "border-ink bg-gold-tint text-gold-deep",
  "gold-fill": "border-ink bg-gold text-white",
  "ink-fill": "border-ink bg-ink text-panel",
  muted: "border-border-neutral text-label bg-transparent",
} as const;

export type TagTone = keyof typeof TONE_CLASS;

export function Tag({ tone = "outline", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-none border-[1.5px] px-2 py-0.5 font-narrow text-[11px] font-semibold uppercase tracking-tag ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
