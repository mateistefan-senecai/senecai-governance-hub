// types.ts
//
// Shared types for the Regulatory Exposure assessment. Reconstructed from
// how questions.ts, scoring.ts, and RegulatoryExposureForm.tsx consume them
// (those three files carry the actual authored content — question copy and
// legal scoring rules — and were kept verbatim); this file is pure
// structural glue with no legal content of its own.

export type RegulationKey = "aiAct" | "gdpr" | "nis2" | "dora" | "cra";

export type AnswerValue = string | boolean | string[];

export type Answers = { [questionId: string]: AnswerValue | undefined };

export type QuestionType = "single" | "boolean" | "multi";

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  helpText?: string;
  /** Which regulation(s) this answer feeds into scoring.ts for — never rendered. */
  scoringTags: RegulationKey[];
  options?: QuestionOption[];
  showIf?: (answers: Answers) => boolean;
  optional?: boolean;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export type ExposureLevel = "not_applicable" | "low" | "monitor" | "high";

export const EXPOSURE_LEVEL_LABELS: Record<ExposureLevel, string> = {
  not_applicable: "Not applicable",
  low: "Low",
  monitor: "Monitor",
  high: "High",
};

export interface RegulationResult {
  regulation: RegulationKey;
  label: string;
  level: ExposureLevel;
  score: number;
  reasons: string[];
  timing?: string;
}

export interface AssessmentResult {
  completedAt: string;
  answers: Answers;
  results: RegulationResult[];
}
