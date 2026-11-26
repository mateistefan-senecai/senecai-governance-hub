"use client";

import { useActionState } from "react";
import { acceptInviteAction, type AcceptState } from "@/lib/actions/invitations";

const LABEL = "block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label";
const INPUT = "mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[14px] text-ink";

export function AcceptForm({ token, hasAccount, defaultName }: { token: string; hasAccount: boolean; defaultName: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction.bind(null, token), {});
  return (
    <form action={action} className="mt-5 space-y-4">
      {!hasAccount && (
        <div>
          <label htmlFor="name" className={LABEL}>Your name</label>
          <input id="name" name="name" required maxLength={120} defaultValue={defaultName} autoComplete="name" className={INPUT} />
        </div>
      )}
      <div>
        <label htmlFor="password" className={LABEL}>{hasAccount ? "Password" : "Choose a password"}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={hasAccount ? undefined : 10}
          autoComplete={hasAccount ? "current-password" : "new-password"}
          className={INPUT}
        />
        {!hasAccount && <p className="mt-1 text-[12px] text-muted">At least 10 characters.</p>}
      </div>
      {!hasAccount && (
        <div>
          <label htmlFor="confirm" className={LABEL}>Repeat the password</label>
          <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className={INPUT} />
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-[13px] text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-gold px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "One moment…" : hasAccount ? "Join and sign in" : "Create my account"}
      </button>
    </form>
  );
}
