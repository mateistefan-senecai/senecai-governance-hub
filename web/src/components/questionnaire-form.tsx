"use client";

import { useMemo, useState } from "react";
import { applicableObligations, evaluate, missingAnswers, pruneAnswers, test, visibleOptions } from "@/lib/content/engine";
import type { AnswerValue, Answers, ContentBundle, Question, Questionnaire } from "@/lib/content/types";
import { RISK_LABEL } from "@/lib/labels";

/**
 * Renders any questionnaire from the content library. Questions appear and
 * disappear as their `showIf` conditions change; answers to hidden
 * questions are dropped before submitting, exactly as the server does.
 * Questions do not show their article references: those belong to the
 * reasoning ("why"), which the reviewer sees with the result.
 */
export function QuestionnaireForm({
  questionnaire,
  initial,
  action,
  submitLabel,
  disabled,
  fixed = {},
  preview,
}: {
  questionnaire: Questionnaire;
  initial: Answers;
  action: (form: FormData) => void | Promise<void>;
  submitLabel: string;
  disabled?: boolean;
  /** Answers settled elsewhere (the AI system record): not asked, and not editable here. */
  fixed?: Answers;
  /** When given, shows the result the current answers lead to (risk class and obligations). */
  preview?: Pick<ContentBundle, "obligations" | "dates">;
}) {
  const [answers, setAnswers] = useState<Answers>({ ...initial, ...fixed });
  const pruned = useMemo(() => pruneAnswers(questionnaire, { ...answers, ...fixed }), [questionnaire, answers, fixed]);
  const missing = useMemo(() => missingAnswers(questionnaire, pruned), [questionnaire, pruned]);
  const set = (id: string, value: AnswerValue) => setAnswers((a) => ({ ...a, [id]: value }));
  const result = useMemo(() => {
    if (!preview || missing.length) return null;
    const { outputs } = evaluate(questionnaire, pruned);
    const obligations = applicableObligations({ ...preview } as ContentBundle, outputs).map((o) => `${o.def.title} (${o.def.article})`);
    return { riskClass: String(outputs.riskClass), obligations };
  }, [preview, missing.length, questionnaire, pruned]);
  // Sections with at least one question to ask, numbered in order.
  const sections = questionnaire.sections
    .map((section) => ({ section, visible: section.questions.filter((q) => !(q.id in fixed) && (!q.showIf || test(q.showIf, pruned, {}))) }))
    .filter((x) => x.visible.length > 0);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="answers" value={JSON.stringify(pruned)} />
      {sections.map(({ section, visible }, i) => {
        return (
          <fieldset key={section.id} className="glass overflow-hidden rounded-2xl border border-ink/10 shadow-[0_20px_40px_-24px_rgb(17_13_10/25%)]" disabled={disabled}>
            <legend className="sr-only">{section.title}</legend>
            <div className="border-b border-ink/10 px-6 py-4">
              <p className="font-mono text-[11px] font-medium tracking-micro-wide text-gold">
                PART {i + 1}
              </p>
              <h2 className="mt-0.5 font-display text-[19px] font-semibold text-ink">{section.title}</h2>
              {section.intro && <p className="mt-0.5 text-[12.5px] text-muted">{section.intro}</p>}
            </div>
            <div className="divide-y divide-ink/[0.06]">
              {visible.map((q) => (
                <QuestionRow key={q.id} q={q} answers={pruned} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
              ))}
            </div>
          </fieldset>
        );
      })}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl bg-ink px-6 py-5 text-rail-text sm:flex-row sm:items-start">
          <span className="shrink-0 self-start rounded-full border border-gold-light px-3 py-1 font-mono text-[11px] tracking-micro text-gold-light">
            {(RISK_LABEL[result.riskClass] ?? result.riskClass).toUpperCase()} · PRELIMINARY
          </span>
          {result.obligations.length > 0 ? (
            <ul className="space-y-1 text-[13px] leading-relaxed">
              {result.obligations.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="text-gold-light">•</span>
                  {o}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]">No obligations follow from these answers.</p>
          )}
        </div>
      )}

      {!disabled && (
        <div className="glass sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 px-6 py-3 shadow-[0_20px_40px_-20px_rgb(17_13_10/35%)]">
          <p className="text-[13px] text-muted">
            {missing.length ? `${missing.length} question${missing.length > 1 ? "s" : ""} left to answer` : "All questions answered"}
          </p>
          <button
            disabled={missing.length > 0}
            className="min-h-11 rounded-[10px] bg-ink px-5 text-[13px] font-semibold text-rail-text shadow-sm hover:bg-ink-hover disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-label disabled:shadow-none"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

function QuestionRow({
  q,
  answers,
  value,
  onChange,
}: {
  q: Question;
  answers: Answers;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const options = visibleOptions(q, answers);
  return (
    <div className="grid gap-3 px-6 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
      <div>
        <p className="text-[14px] font-medium leading-snug text-ink">{q.text}</p>
        {q.help && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{q.help}</p>}
      </div>
      <div>
        {q.type === "boolean" && (
          <div className="inline-flex gap-1 rounded-xl bg-ink/[0.06] p-1">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={value === v}
                onClick={() => onChange(v)}
                className={`min-h-10 min-w-20 rounded-[9px] px-4 text-[13px] font-semibold ${
                  value === v ? "bg-ink text-rail-text shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        )}
        {q.type === "text" && (
          <input
            type="text"
            aria-label={q.text}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            maxLength={200}
            className="block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] text-ink"
          />
        )}
        {q.type === "single" && (
          <div className="space-y-0.5">
            {options.map((o) => (
              <label key={o.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-body hover:bg-ink/[0.04] ${value === o.id ? "bg-ink/[0.05] text-ink" : ""}`}>
                <input type="radio" name={q.id} checked={value === o.id} onChange={() => onChange(o.id)} className="mt-0.5 accent-[var(--color-gold)]" />
                {o.label}
              </label>
            ))}
          </div>
        )}
        {q.type === "multi" && (
          <div className="space-y-2">
            {options.map((o) => {
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
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
