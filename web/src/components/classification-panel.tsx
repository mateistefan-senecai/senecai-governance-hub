"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DecisionTreeWizard } from "@/components/decision-tree-wizard";
import { markReviewed } from "@/lib/actions/ai-systems";

export function ClassificationPanel({
  aiSystemId,
  treeId,
  field,
  label,
  currentValue,
  reviewed,
  canReview,
}: {
  aiSystemId: string;
  treeId: string;
  field: "legalRole" | "riskClassification";
  label: string;
  currentValue: string | null;
  reviewed: boolean;
  canReview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const router = useRouter();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        {currentValue && (
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              reviewed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {currentValue.replace(/_/g, " ")}
            {!reviewed && " (preliminary)"}
          </span>
        )}
      </div>

      {!open && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {currentValue ? "Re-run classification" : "Run classification"}
          </button>
          {currentValue && !reviewed && canReview && (
            <button
              disabled={marking}
              onClick={async () => {
                setMarking(true);
                await markReviewed(aiSystemId, field);
                setMarking(false);
                router.refresh();
              }}
              className="text-sm text-emerald-700 underline"
            >
              {marking ? "Marking…" : "Mark reviewed by consultant"}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3">
          <DecisionTreeWizard treeId={treeId} aiSystemId={aiSystemId} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
