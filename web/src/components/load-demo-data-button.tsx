"use client";

import { useState } from "react";
import { loadDemoData } from "@/lib/actions/demo-data";

/**
 * SENECAI_ADMIN-only control, shown in the nav sidebar footer. Exists because
 * a deployed environment's database isn't reachable to run `prisma db seed`
 * against directly — this loads the same synthetic 3-client dataset through
 * the running app's own DB connection instead. Safe to click more than once.
 */
export function LoadDemoDataButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={state === "loading"}
        onClick={async () => {
          setState("loading");
          try {
            await loadDemoData();
            setState("done");
          } catch {
            setState("error");
          }
        }}
        className="w-full rounded-lg border border-hairline px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-gold hover:bg-gold-tint disabled:opacity-50"
      >
        {state === "loading" ? "Loading…" : "Load demo data"}
      </button>
      {state === "done" && (
        <p className="mt-1.5 text-[11px] text-gold-deep">
          Demo data loaded — 3 clients, 12 AI systems.
        </p>
      )}
      {state === "error" && (
        <p className="mt-1.5 text-[11px] text-red-600">Something went wrong. Check the logs.</p>
      )}
    </div>
  );
}
