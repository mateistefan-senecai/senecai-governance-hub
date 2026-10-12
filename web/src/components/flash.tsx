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
      className={`flex items-center justify-between gap-4 border-b px-8 py-2.5 text-[13px] ${
        error ? "border-red-200 bg-red-50 text-red-800" : "border-hairline bg-gold-tint text-gold-deep"
      }`}
    >
      <p>
        <span className="mr-2 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide">
          {error ? "Not saved" : "Done"}
        </span>
        {error ?? notice}
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-lg leading-none hover:opacity-70">
        ×
      </button>
    </div>
  );
}
