"use client";

// RegulatoryExposureForm.tsx
//
// Onboarding wizard for the SenecAI Governance Hub. Walks a client through
// org profile / data / AI / product / critical-services / financial-activity
// questions (see questions.ts — deliberately never labels a question by
// regulation name), then renders a results panel with a triage badge per
// regulation (see scoring.ts for the actual rules).
//
// Wiring: this component doesn't call any API itself. Pass an `onComplete`
// callback and persist from the parent — see
// src/app/(app)/overview/assessment/[orgId]/page.tsx, which saves the result
// via the `saveExposureAssessment` server action.
//
// Styling: reuses the Hub's own primitives (Panel, Button, Tag, ProgressBar,
// OptionRow) and design tokens instead of one-off Tailwind literals, so this
// reads as part of the app rather than a bolted-on page.

import { useMemo, useState } from "react";
import { sections, isQuestionVisible } from "./questions";
import { scoreAll } from "./scoring";
import {
  Answers,
  AssessmentResult,
  ExposureLevel,
  EXPOSURE_LEVEL_LABELS,
  Question,
  RegulationResult,
} from "./types";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { ProgressBar } from "@/components/ui/progress-bar";
import { OptionRow } from "@/components/ui/option-row";
import { LEVEL_TAG_TONE } from "./exposure-badges";

const LEVEL_DOT_CLASS: Record<ExposureLevel, string> = {
  not_applicable: "bg-border-neutral",
  low: "bg-border-neutral",
  monitor: "bg-gold",
  high: "bg-gold",
};

export interface RegulatoryExposureFormProps {
  /** Called with the full assessment once the user reaches and confirms the results screen. */
  onComplete?: (result: AssessmentResult) => void;
  /** Called on every step change with the current step index and total steps. */
  onStepChange?: (stepIndex: number, totalSteps: number) => void;
  /** Optional organization name to personalize the header/results. */
  organizationName?: string;
  /** Optional initial answers, e.g. to resume a saved-but-incomplete assessment. */
  initialAnswers?: Answers;
  /** Shown next to the primary results action instead of the default label. */
  confirmLabel?: string;
  saving?: boolean;
}

export default function RegulatoryExposureForm({
  onComplete,
  onStepChange,
  organizationName,
  initialAnswers,
  confirmLabel,
  saving,
}: RegulatoryExposureFormProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const totalSteps = sections.length + 1; // +1 for results
  const currentSection = sections[sectionIndex];

  const visibleQuestions = useMemo(
    () => currentSection.questions.filter((q) => isQuestionVisible(q, answers)),
    [currentSection, answers],
  );

  const results: RegulationResult[] | null = showResults ? scoreAll(answers) : null;

  function setAnswer(id: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, value: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const exclusiveNone = value === "none";
      let next: string[];
      if (current.includes(value)) {
        next = current.filter((v) => v !== value);
      } else if (exclusiveNone) {
        next = ["none"];
      } else {
        next = [...current.filter((v) => v !== "none"), value];
      }
      return { ...prev, [id]: next };
    });
  }

  function isAnswered(q: Question): boolean {
    if (q.optional) return true;
    const v = answers[q.id];
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== "";
  }

  const canAdvance = visibleQuestions.every(isAnswered);

  function goNext() {
    if (sectionIndex < sections.length - 1) {
      const nextIndex = sectionIndex + 1;
      setSectionIndex(nextIndex);
      onStepChange?.(nextIndex, totalSteps);
    } else {
      setShowResults(true);
      onStepChange?.(sections.length, totalSteps);
    }
  }

  function goBack() {
    if (showResults) {
      setShowResults(false);
      return;
    }
    if (sectionIndex > 0) {
      const prevIndex = sectionIndex - 1;
      setSectionIndex(prevIndex);
      onStepChange?.(prevIndex, totalSteps);
    }
  }

  function confirmResults() {
    if (!results) return;
    onComplete?.({
      completedAt: new Date().toISOString(),
      answers,
      results,
    });
  }

  if (showResults && results) {
    return (
      <ResultsView
        results={results}
        organizationName={organizationName}
        onBack={goBack}
        onConfirm={confirmResults}
        confirmLabel={confirmLabel}
        saving={saving}
      />
    );
  }

  const stepNumber = sectionIndex + 1;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
          <span>
            Step {stepNumber} of {sections.length}
          </span>
          <span>{currentSection.title}</span>
        </div>
        <ProgressBar percent={Math.round((stepNumber / sections.length) * 100)} />
      </div>

      <Panel padded={false} className="p-6 sm:p-8">
        {/* Section header */}
        <div className="mb-6">
          <h2 className="text-[22px] font-semibold text-ink">{currentSection.title}</h2>
          {currentSection.description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{currentSection.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {visibleQuestions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onSetSingle={(v) => setAnswer(q.id, v)}
              onToggleMulti={(v) => toggleMulti(q.id, v)}
            />
          ))}
        </div>

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
          <Button type="button" variant="ghost" onClick={goBack} disabled={sectionIndex === 0}>
            Back
          </Button>
          <Button type="button" variant="primary" onClick={goNext} disabled={!canAdvance}>
            {sectionIndex < sections.length - 1 ? "Continue →" : "See results →"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question field renderer
// ---------------------------------------------------------------------------

function QuestionField({
  question,
  value,
  onSetSingle,
  onToggleMulti,
}: {
  question: Question;
  value: Answers[string];
  onSetSingle: (v: Answers[string]) => void;
  onToggleMulti: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[15.5px] font-semibold text-ink">
        {question.prompt}
        {question.optional && <span className="ml-2 text-[11.5px] font-normal text-label">(optional)</span>}
      </legend>
      {question.helpText && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{question.helpText}</p>}

      {question.type === "boolean" && (
        <div className="mt-3.5 overflow-hidden rounded-xl border border-hairline">
          <OptionRow label="Yes" selected={value === true} multi={false} onClick={() => onSetSingle(true)} />
          <div className="border-t border-hairline" />
          <OptionRow label="No" selected={value === false} multi={false} onClick={() => onSetSingle(false)} />
        </div>
      )}

      {question.type === "single" && question.options && (
        <div className="mt-3.5 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
          {question.options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              help={opt.hint}
              selected={value === opt.value}
              multi={false}
              onClick={() => onSetSingle(opt.value)}
            />
          ))}
        </div>
      )}

      {question.type === "multi" && question.options && (
        <div className="mt-3.5 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
          {question.options.map((opt) => {
            const checked = Array.isArray(value) && value.includes(opt.value);
            return (
              <OptionRow
                key={opt.value}
                label={opt.label}
                help={opt.hint}
                selected={checked}
                multi
                onClick={() => onToggleMulti(opt.value)}
              />
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------

function ResultsView({
  results,
  organizationName,
  onBack,
  onConfirm,
  confirmLabel,
  saving,
}: {
  results: RegulationResult[];
  organizationName?: string;
  onBack: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  saving?: boolean;
}) {
  const flagged = results.filter((r) => r.level === "high" || r.level === "monitor");
  const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold text-ink">
          Regulatory exposure{organizationName ? ` — ${organizationName}` : ""}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          A triage read on where the organization sits against five EU frameworks. This is a starting point for
          your engagement, not a legal scoping opinion —{" "}
          {flagged.length > 0 ? "the flagged items below" : "everything below"} should be reviewed with a
          qualified advisor before it&rsquo;s treated as final.
        </p>
      </div>

      {/* Aggregate score card — same visual language as the Overview page */}
      <Panel className="mb-4">
        <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
          Aggregate exposure score
        </p>
        <p className="mt-1 text-[52px] font-semibold leading-none tracking-tightest text-ink">{overallScore}%</p>
        <div className="mt-4">
          <ProgressBar percent={overallScore} height="md" />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Averages the triage score across AI Act, GDPR, NIS2, DORA and CRA. Higher means more obligations to plan
          for — not a compliance-readiness percentage.
        </p>
      </Panel>

      {/* Per-regulation card */}
      <Panel>
        <p className="mb-3 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
          Per-regulation exposure
        </p>
        <div className="divide-y divide-hairline">
          {results.map((r) => (
            <ResultCard key={r.regulation} result={r} />
          ))}
        </div>
      </Panel>

      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to questions
        </Button>
        <Button type="button" variant="primary" onClick={onConfirm} disabled={saving}>
          {saving ? "Saving…" : (confirmLabel ?? "Confirm and continue →")}
        </Button>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: RegulationResult }) {
  const [open, setOpen] = useState(result.level === "high");

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13.5px] font-medium text-ink">{result.label}</span>
        <div className="flex items-center gap-3">
          <Tag tone={LEVEL_TAG_TONE[result.level]}>{EXPOSURE_LEVEL_LABELS[result.level]}</Tag>
          <span className="text-label">{open ? "–" : "+"}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3">
          <ul className="space-y-1.5 text-[12.5px] text-body">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_DOT_CLASS[result.level]}`} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {result.timing && <p className="mt-3 text-[11.5px] text-label">{result.timing}</p>}
        </div>
      )}
    </div>
  );
}
