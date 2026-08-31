"use client";

import { useState } from "react";
import type { TreeNode } from "@/lib/decision-trees/types";
import { OptionRow } from "./option-row";

export function QuestionBody({
  node,
  onAnswerYesNo,
  onSubmitChecklist,
}: {
  node: TreeNode;
  onAnswerYesNo: (value: boolean) => void;
  onSubmitChecklist: (checked: string[]) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);

  function toggle(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div>
      <p className="text-[15.5px] font-semibold text-ink">{node.text}</p>
      {node.help && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{node.help}</p>}

      {node.kind === "boolean" && (
        <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
          <OptionRow label="Yes" selected={false} multi={false} onClick={() => onAnswerYesNo(true)} />
          <OptionRow label="No" selected={false} multi={false} onClick={() => onAnswerYesNo(false)} />
        </div>
      )}

      {(node.kind === "checklist" || node.kind === "signalChecklist") && (
        <>
          <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
            {node.options.map((opt) => (
              <OptionRow
                key={opt.id}
                label={opt.label}
                help={opt.help}
                citation={opt.citation}
                selected={checked.includes(opt.id)}
                multi
                onClick={() => toggle(opt.id)}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11.5px] text-muted">
              {checked.length} of {node.options.length} ticked
            </p>
            <button
              type="button"
              onClick={() => onSubmitChecklist(checked)}
              className="rounded-lg border border-transparent bg-gold px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-gold-hover hover:shadow-md"
            >
              Continue →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
