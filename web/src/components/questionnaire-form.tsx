"use client";

import { useMemo, useState } from "react";
import { missingAnswers, pruneAnswers, test } from "@/lib/content/engine";
import type { AnswerValue, Answers, Question, Questionnaire } from "@/lib/content/types";
import { Citation } from "@/components/ui/citation";

/**
 * Renders any questionnaire from the content library. Questions appear and
 * disappear as their `showIf` conditions change; answers to hidden
 * questions are dropped before submitting, exactly as the server does.
 */
export function QuestionnaireForm({
  questionnaire,
  initial,
  action,
  submitLabel,
  disabled,
}: {
  questionnaire: Questionnaire;
  initial: Answers;
  action: (form: FormData) => void | Promise<void>;
  submitLabel: string;
  disabled?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const pruned = useMemo(() => pruneAnswers(questionnaire, answers), [questionnaire, answers]);
  const missing = useMemo(() => missingAnswers(questionnaire, pruned), [questionnaire, pruned]);
  const set = (id: string, value: AnswerValue) => setAnswers((a) => ({ ...a, [id]: value }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="answers" value={JSON.stringify(pruned)} />
      {questionnaire.sections.map((section, si) => {
        const visible = section.questions.filter((q) => !q.showIf || test(q.showIf, answers, {}));
        if (!visible.length) return null;
        return (
          <fieldset key={section.id} className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm" disabled={disabled}>
            <legend className="sr-only">{section.title}</legend>
            <div className="border-b border-hairline bg-panel px-5 py-3">
              <p className="font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-gold-hover">
                Part {si + 1}
              </p>
              <h2 className="text-[15px] font-semibold text-ink">{section.title}</h2>
              {section.intro && <p className="mt-0.5 text-[12.5px] text-muted">{section.intro}</p>}
            </div>
            <div className="divide-y divide-hairline-light">
              {visible.map((q) => (
                <QuestionRow key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
              ))}
            </div>
          </fieldset>
        );
      })}

      {!disabled && (
        <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface/95 px-5 py-3 shadow-md backdrop-blur">
          <p className="text-[13px] text-muted">
            {missing.length ? `${missing.length} question${missing.length > 1 ? "s" : ""} left to answer` : "All questions answered"}
          </p>
          <button
            disabled={missing.length > 0}
            className="rounded-lg bg-gold px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

function QuestionRow({ q, value, onChange }: { q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void }) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
      <div>
        <p className="text-[13.5px] font-medium leading-snug text-ink">{q.text}</p>
        {q.help && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{q.help}</p>}
        {q.citation && <Citation>{q.citation}</Citation>}
      </div>
      <div>
        {q.type === "boolean" && (
          <div className="inline-flex gap-1 rounded-lg border border-hairline bg-hairline-light p-1">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={value === v}
                onClick={() => onChange(v)}
                className={`rounded-md px-4 py-1.5 text-[12.5px] font-semibold ${
                  value === v ? "bg-ink text-panel shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        )}
        {q.type === "single" && (
          <div className="space-y-1.5">
            {q.options!.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-start gap-2 text-[13px] text-body">
                <input type="radio" name={q.id} checked={value === o.id} onChange={() => onChange(o.id)} className="mt-0.5 accent-[var(--color-gold)]" />
                {o.label}
              </label>
            ))}
          </div>
        )}
        {q.type === "multi" && (
          <div className="space-y-2">
            {q.options!.map((o) => {
              const list = Array.isArray(value) ? value : [];
              const checked = list.includes(o.id);
              return (
                <label key={o.id} className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug text-body">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(checked ? list.filter((x) => x !== o.id) : [...list, o.id])}
                    className="mt-0.5 accent-[var(--color-gold)]"
                  />
                  <span>
                    {o.label}
                    {o.citation && <span className="ml-1.5 whitespace-nowrap text-[11px] text-label">{o.citation}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
