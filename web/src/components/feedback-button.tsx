"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sendFeedback, type FeedbackState } from "@/lib/actions/feedback";

/** A "Send feedback" button on every screen; the message goes to SenecAI with the page it was sent from. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  // A new form each time the panel opens, so a sent message does not linger.
  const [round, setRound] = useState(0);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden">
      {open && <FeedbackForm key={round} onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => {
          if (!open) setRound((r) => r + 1);
          setOpen(!open);
        }}
        aria-expanded={open}
        className="rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-rail-text shadow-lg hover:bg-ink-hover"
      >
        Send feedback
      </button>
    </div>
  );
}

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback, { ok: false });

  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [state.ok, onClose]);

  return (
    <div role="dialog" aria-label="Send feedback" className="w-[min(360px,calc(100vw-40px))] rounded-2xl border border-ink/10 bg-surface p-4 shadow-xl">
      {state.ok ? (
        <p role="status" className="text-[13.5px] text-ink">
          Thank you. Your feedback went to the SenecAI team.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="page" value={pathname} />
          <label htmlFor="feedback-message" className="block text-[13.5px] font-semibold text-ink">
            What should we know?
          </label>
          <textarea
            id="feedback-message"
            name="message"
            required
            maxLength={2000}
            rows={5}
            placeholder="Something unclear, a question you did not understand, a bug, an idea…"
            className="block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink"
          />
          <p className="text-[11.5px] text-muted">Sent with your name, email and this page. Please don&rsquo;t include client data you would not email us.</p>
          {state.error && (
            <p role="alert" className="text-[12.5px] text-red-700">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-ink">
              Cancel
            </button>
            <button disabled={pending} className="rounded-[10px] bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-rail-text hover:bg-ink-hover disabled:opacity-50">
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
