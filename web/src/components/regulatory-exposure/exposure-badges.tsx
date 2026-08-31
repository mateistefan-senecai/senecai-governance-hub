import { Tag, type TagTone } from "@/components/ui/tag";
import { EXPOSURE_LEVEL_LABELS, type ExposureLevel, type RegulationResult } from "./types";

/** Shared between ResultCard (in the form) and the Overview summary row. */
export const LEVEL_TAG_TONE: Record<ExposureLevel, TagTone> = {
  not_applicable: "muted",
  low: "outline",
  monitor: "prelim",
  high: "gold-fill",
};

export function ExposureBadges({ results }: { results: RegulationResult[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {results.map((r) => (
        <Tag key={r.regulation} tone={LEVEL_TAG_TONE[r.level]}>
          {r.label}: {EXPOSURE_LEVEL_LABELS[r.level]}
        </Tag>
      ))}
    </div>
  );
}
