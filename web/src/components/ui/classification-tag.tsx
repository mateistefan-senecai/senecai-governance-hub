import type { LegalRole, RiskClassification } from "@/generated/prisma/enums";
import { Tag } from "./tag";

type ClassificationValue = LegalRole | RiskClassification;

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

/**
 * Tag semantics from the design spec: approved role/limited/minimal risk is
 * an outline tag, preliminary is gold-tint, high risk is always gold-fill
 * (whether reviewed or not), prohibited/implemented is ink-fill, and
 * not-classified/review-required states are muted.
 */
export function ClassificationTag({
  value,
  reviewed,
  variant = "table",
}: {
  value: ClassificationValue | null;
  reviewed: boolean;
  /** "table" appends " · prelim" only when unreviewed; "record" always appends " · preliminary" / " · approved". */
  variant?: "table" | "record";
}) {
  if (!value) return <Tag tone="muted">Not classified</Tag>;

  if (value === "REVIEW_REQUIRED" || value === "OUT_OF_SCOPE") {
    return <Tag tone="muted">{formatLabel(value)}</Tag>;
  }

  const suffix =
    variant === "table" ? (reviewed ? "" : " · prelim") : reviewed ? " · approved" : " · preliminary";

  if (value === "PROHIBITED") {
    return (
      <Tag tone="ink-fill">
        {formatLabel(value)}
        {suffix}
      </Tag>
    );
  }
  if (value === "HIGH_RISK") {
    return (
      <Tag tone="gold-fill">
        {formatLabel(value)}
        {suffix}
      </Tag>
    );
  }

  return (
    <Tag tone={reviewed ? "outline" : "prelim"}>
      {formatLabel(value)}
      {suffix}
    </Tag>
  );
}
