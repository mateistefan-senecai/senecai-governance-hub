"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Self-dismissing by default: clears the `?notice=` search param the
 * redirect+notice convention uses (see server actions in lib/actions).
 * Pass `onDismiss` to override for local-state-only notices (stub actions
 * like "Generate dossier" that have nothing to redirect to).
 */
export function NoticeBar({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    } else {
      router.replace(pathname);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-gold-tint px-8 py-2.5">
      <p className="text-[13px] text-gold-deep">
        <span className="mr-2 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide">Notice</span>
        {message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notice"
        className="text-ink hover:text-gold-hover"
      >
        ×
      </button>
    </div>
  );
}
