"use client";

import { useActionState, useState } from "react";
import type { InviteState } from "@/lib/actions/invitations";

const LABEL = "block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label";
const INPUT = "mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink";

type Option = { value: string; label: string; hint?: string };

/** The link to pass on, or confirmation that it went out by email. */
export function InviteResult({ state }: { state: InviteState }) {
  const [copied, setCopied] = useState(false);
  if (!state.ok || !state.link) return null;
  return (
    <div role="status" className="mt-4 rounded-xl border border-gold/30 bg-gold-tint/60 p-4 text-[13px] text-ink">
      <p className="font-semibold">
        {state.emailed
          ? `Invitation emailed${state.email ? ` to ${state.email}` : ""}.`
          : `Invitation ready${state.name ? ` for ${state.name}` : ""}. No email was sent: send them this link yourself.`}
      </p>
      <p className="mt-1 text-[12px] text-muted">
        {state.emailed
          ? "You can also send this link yourself. It works once and expires in 14 days."
          : "It works once and expires in 14 days. Anyone with the link can create the account, so send it only to the person invited."}
      </p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={state.link} aria-label="Invitation link" className={`${INPUT} mt-0 font-mono text-[11.5px]`} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(state.link!);
            setCopied(true);
          }}
          className="shrink-0 rounded-[10px] border border-transparent bg-ink px-3 py-1.5 text-[12px] font-semibold text-rail-text hover:bg-ink-hover"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

function ErrorLine({ state }: { state: InviteState }) {
  return state.error ? (
    <p role="alert" className="mt-3 text-[13px] text-red-700">
      {state.error}
    </p>
  ) : null;
}

/**
 * Invite a person. `roles` lists only what the viewer may invite; `clients`
 * (optional) lets an admin pick the client, otherwise `clientId` is fixed.
 */
export function InviteForm({
  action,
  roles,
  clients,
  clientId,
  back,
}: {
  action: (prev: InviteState, form: FormData) => Promise<InviteState>;
  roles: Option[];
  clients?: Option[];
  clientId?: string;
  back: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [role, setRole] = useState(roles[0]?.value ?? "");
  const hint = roles.find((r) => r.value === role)?.hint;
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="back" value={back} />
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inv-name" className={LABEL}>Name</label>
          <input id="inv-name" name="name" required maxLength={120} className={INPUT} />
        </div>
        <div>
          <label htmlFor="inv-email" className={LABEL}>Email</label>
          <input id="inv-email" name="email" type="email" required maxLength={200} className={INPUT} />
        </div>
        <div>
          <label htmlFor="inv-role" className={LABEL}>Role</label>
          {roles.length === 1 ? (
            <>
              <input type="hidden" name="role" value={roles[0].value} />
              <p className="mt-1.5 py-2 text-[13px] text-ink">{roles[0].label}</p>
            </>
          ) : (
            <select id="inv-role" name="role" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {clients && role !== "ORG_ADMIN" && (
          <div>
            <label htmlFor="inv-client" className={LABEL}>{role === "COMPANY_USER" ? "Company" : "Client (optional)"}</label>
            <select id="inv-client" name="clientId" required={role === "COMPANY_USER"} defaultValue="" className={INPUT}>
              <option value="">{role === "COMPANY_USER" ? "Choose the company" : "No client yet"}</option>
              {clients.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
      <button
        disabled={pending}
        className="inline-flex items-center rounded-[10px] border border-transparent bg-ink px-4 py-2 text-[12.5px] font-semibold text-rail-text shadow-sm hover:bg-ink-hover disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invitation"}
      </button>
      <ErrorLine state={state} />
      <InviteResult state={state} />
    </form>
  );
}

/** "New link" for a pending invitation, showing the link it creates. */
export function RenewLink({
  action,
  fields,
  label = "New link",
}: {
  action: (prev: InviteState, form: FormData) => Promise<InviteState>;
  fields: Record<string, string>;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button disabled={pending} className="rounded-[10px] border border-ink/15 bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-ink hover:border-ink/40 disabled:opacity-50">
        {pending ? "…" : label}
      </button>
      <ErrorLine state={state} />
      <InviteResult state={state} />
    </form>
  );
}
