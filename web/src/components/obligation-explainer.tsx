import type { ReactNode } from "react";
import type { Explainer } from "@/lib/content/types";
import { formatDate } from "@/lib/labels";

/** "text with **key words**" → text with <strong> key words. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/** A point is a line of text, optionally followed by "\n  - " sub-points. */
function Point({ text }: { text: string }) {
  const [lead, ...subs] = text.split(/\n\s*-\s+/);
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-body">
      <span className="mt-[2px] text-gold">▪</span>
      <div>
        {rich(lead)}
        {subs.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {subs.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-label">–</span>
                <span>{rich(s)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/**
 * "Understand this obligation better": the practitioner's explanation of an
 * obligation, from the legal content (versioned with it). Closed by default
 * so the six-part record stays the first thing on the page.
 */
export function ObligationExplainer({ explainer }: { explainer: Explainer }) {
  return (
    <details className="group rounded-xl border border-gold/30 bg-gold-tint/40 shadow-sm lg:col-span-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">Guidance</span>
          <span className="block text-[15px] font-semibold text-ink">Understand this obligation better</span>
        </span>
        <span className="shrink-0 rounded-full border border-hairline bg-surface px-3 py-1 text-[12px] font-semibold text-ink">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="border-t border-gold/20 px-5 pb-5 pt-4">
        <p className="max-w-4xl text-[13.5px] leading-relaxed text-body">{rich(explainer.intro)}</p>
        <div className="mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-2">
          {explainer.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="mb-2 text-[13.5px] font-semibold text-ink">{section.heading}</h3>
              <ul className="space-y-1.5">
                {section.points.map((p) => (
                  <Point key={p} text={p} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">Sources</p>
          <ul className="mt-1.5 space-y-1">
            {explainer.sources.map((s) => (
              <li key={s.url} className="text-[12.5px] text-muted">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-hover underline-offset-2 hover:underline">
                  {s.label} ↗
                </a>
                {s.note && <span> · {s.note}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-relaxed text-label">
            Guidance from supervisory authorities is not binding; the obligation itself is the text of the Act. Checked against these sources on{" "}
            {formatDate(new Date(explainer.checked))}.
          </p>
        </div>
      </div>
    </details>
  );
}
