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
    <div className="flex items-center justify-between gap-4 bg-ink/90 px-8 py-2.5 text-rail-text backdrop-blur">
      <p className="text-[13px]">
        <span className="mr-2 font-mono text-[10.5px] font-medium tracking-micro text-gold-light">Notice</span>
        {message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notice"
        className="flex size-8 items-center justify-center text-lg hover:text-gold-light"
      >
        ×
      </button>
    </div>
  );
}
