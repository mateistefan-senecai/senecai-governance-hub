"use client";

import { useState } from "react";
import Link from "next/link";
import { ClassificationTag } from "@/components/ui/classification-tag";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import type { LegalRole, RiskClassification } from "@/generated/prisma/enums";

export type InventoryRow = {
  id: string;
  name: string;
  description: string | null;
  organizationName: string;
  businessProcess: string | null;
  autonomyLevel: string | null;
  implementationStage: string | null;
  legalRole: LegalRole | null;
  riskClassification: RiskClassification | null;
  legalRoleReviewed: boolean;
  riskClassificationReviewed: boolean;
  readinessPercent: number | null;
};

export function InventoryLayouts({
  rows,
  stats,
}: {
  rows: InventoryRow[];
  stats: { systems: number; highRisk: number; awaitingReview: number; classified: number; total: number };
}) {
  const [layout, setLayout] = useState<"table" | "split">("table");
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-8 py-4">
        <div className="flex items-center gap-4">
          <SegmentedControl
            options={[
              { value: "table", label: "Layout A · Dense register" },
              { value: "split", label: "Layout B · List + preview" },
            ]}
            value={layout}
            onChange={setLayout}
          />
          <p className="text-[12px] text-muted">Two layouts for the same data — pick whichever reads best.</p>
        </div>
        <div className="flex items-center gap-8">
          <StatTile label="Systems" value={stats.systems} />
          <StatTile label="High risk" value={stats.highRisk} />
          <StatTile label="Awaiting review" value={stats.awaitingReview} />
          <StatTile label="Classified" value={`${stats.classified}/${stats.total}`} />
        </div>
      </div>

      <div className="p-8">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No AI systems yet.
          </p>
        ) : layout === "table" ? (
          <LayoutA rows={rows} />
        ) : (
          <LayoutB rows={rows} selectedId={selectedId} onSelect={setSelectedId} />
        )}

        <p className="mt-3 text-[11.5px] text-muted">
          Classifications are preliminary until a consultant reviews them. Fields follow the canonical 14-column
          questionnaire.
        </p>
      </div>
    </>
  );
}

function LayoutA({ rows }: { rows: InventoryRow[] }) {
  const showOrgColumn = new Set(rows.map((r) => r.organizationName)).size > 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead className="bg-ink">
          <tr>
            {[
              "AI system",
              ...(showOrgColumn ? ["Organization"] : []),
              "Business process",
              "Autonomy",
              "Stage",
              "Legal role",
              "Risk class",
              "Readiness",
              "",
            ].map((h) => (
              <th
                key={h}
                className="px-3.5 py-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-panel"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-row-hover">
              <td className="px-3.5 py-3">
                <Link
                  href={`/inventory/${r.id}`}
                  className="text-[13px] font-medium text-gold-hover underline decoration-gold underline-offset-[3px] hover:text-ink"
                >
                  {r.name}
                </Link>
                {r.description && <p className="mt-0.5 text-[11.5px] text-muted">{r.description}</p>}
              </td>
              {showOrgColumn && (
                <td className="px-3.5 py-3 text-[13px] text-body">{r.organizationName}</td>
              )}
              <td className="px-3.5 py-3 text-[13px] text-body">{r.businessProcess ?? "—"}</td>
              <td className="px-3.5 py-3 text-[13px] text-body">{r.autonomyLevel ?? "—"}</td>
              <td className="px-3.5 py-3 text-[13px] text-body">{r.implementationStage ?? "—"}</td>
              <td className="px-3.5 py-3">
                <ClassificationTag value={r.legalRole} reviewed={r.legalRoleReviewed} />
              </td>
              <td className="px-3.5 py-3">
                <ClassificationTag value={r.riskClassification} reviewed={r.riskClassificationReviewed} />
              </td>
              <td className="px-3.5 py-3">
                <ProgressBar percent={r.readinessPercent} showLabel />
              </td>
              <td className="px-3.5 py-3 text-right">
                <Button variant="ghost" size="sm" href={`/inventory/${r.id}`}>
                  Open
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LayoutB({
  rows,
  selectedId,
  onSelect,
}: {
  rows: InventoryRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm md:grid-cols-[minmax(300px,1fr)_minmax(0,1.35fr)]">
      <div className="divide-y divide-hairline border-b border-hairline md:border-b-0 md:border-r">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`block w-full border-l-4 px-4 py-3.5 text-left ${
              r.id === selected.id ? "border-l-gold bg-row-hover" : "border-l-transparent hover:bg-row-hover"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-medium text-ink">{r.name}</span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted">
                {r.readinessPercent === null ? "—" : `${r.readinessPercent}%`}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {[r.businessProcess, r.implementationStage].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <ClassificationTag value={r.legalRole} reviewed={r.legalRoleReviewed} />
              <ClassificationTag value={r.riskClassification} reviewed={r.riskClassificationReviewed} />
            </div>
          </button>
        ))}
      </div>

      <div className="p-5">
        <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Preview</p>
        <h3 className="mt-1 text-[21px] font-semibold text-ink">{selected.name}</h3>
        {selected.description && <p className="mt-1.5 text-[13px] leading-relaxed text-body">{selected.description}</p>}

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
          <MetaCell label="Organization" value={selected.organizationName} />
          <MetaCell label="Business process" value={selected.businessProcess} />
          <MetaCell label="Autonomy" value={selected.autonomyLevel} />
          <MetaCell label="Stage" value={selected.implementationStage} />
          <MetaCell label="Legal role" value={selected.legalRole?.replace(/_/g, " ") ?? null} />
          <MetaCell label="Risk class" value={selected.riskClassification?.replace(/_/g, " ") ?? null} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" href={`/inventory/${selected.id}`}>
            Open full record →
          </Button>
          <Button variant="ghost" href={`/inventory/${selected.id}`}>
            Run classification
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-surface px-3.5 py-2.5">
      <p className="font-narrow text-[9.5px] font-semibold uppercase tracking-micro text-label">{label}</p>
      <p className="mt-0.5 text-[13px] text-ink">{value ?? "—"}</p>
    </div>
  );
}
