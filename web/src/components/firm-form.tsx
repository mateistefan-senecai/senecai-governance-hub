"use client";

import { useActionState } from "react";
import type { InviteState } from "@/lib/actions/invitations";
import { InviteResult } from "@/components/invite-form";

const LABEL = "block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label";
const INPUT = "mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink";

export function FirmForm({ action }: { action: (prev: InviteState, form: FormData) => Promise<InviteState> }) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="firm-name" className={LABEL}>Firm name</label>
        <input id="firm-name" name="name" required maxLength={200} placeholder="e.g. Popescu & Partners" className={INPUT} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firm-admin" className={LABEL}>Admin&rsquo;s name</label>
          <input id="firm-admin" name="adminName" required maxLength={120} className={INPUT} />
        </div>
        <div>
          <label htmlFor="firm-email" className={LABEL}>Admin&rsquo;s email</label>
          <input id="firm-email" name="adminEmail" type="email" required maxLength={200} className={INPUT} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-[13px] text-ink">
        <input type="checkbox" name="pilot" defaultChecked className="mt-0.5" />
        <span>
          Pilot firm <span className="block text-[12px] text-muted">Every PDF the firm generates carries a &ldquo;Test version – not legal advice&rdquo; watermark.</span>
        </span>
      </label>
      <button
        disabled={pending}
        className="inline-flex items-center rounded-[10px] border border-transparent bg-ink px-4 py-2 text-[12.5px] font-semibold text-rail-text shadow-sm hover:bg-ink-hover disabled:opacity-50"
      >
        {pending ? "Opening…" : "Open workspace and invite the admin"}
      </button>
      {state.error && (
        <p role="alert" className="text-[13px] text-red-700">
          {state.error}
        </p>
      )}
      <InviteResult state={state} />
    </form>
  );
}
