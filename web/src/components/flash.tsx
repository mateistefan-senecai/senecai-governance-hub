"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Shows ?notice= (success) or ?error= (refused action) set by server actions. */
export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const error = params.get("error");
  const notice = params.get("notice");
  if (!error && !notice) return null;

  function dismiss() {
    const next = new URLSearchParams(params);
    next.delete("error");
    next.delete("notice");
    router.replace(next.size ? `${pathname}?${next}` : pathname);
  }

  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-center justify-between gap-4 px-8 py-2.5 text-[13px] ${
        error ? "border-b border-red-200 bg-red-50 text-red-800" : "bg-ink/90 text-rail-text backdrop-blur"
      }`}
    >
      <p>
        <span className={`mr-2.5 font-mono text-[10.5px] font-medium tracking-micro ${error ? "" : "text-gold-light"}`}>
          {error ? "NOT SAVED" : "✓ DONE"}
        </span>
        {error ?? notice}
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex size-8 items-center justify-center text-lg leading-none hover:opacity-70">
        ×
      </button>
    </div>
  );
}
