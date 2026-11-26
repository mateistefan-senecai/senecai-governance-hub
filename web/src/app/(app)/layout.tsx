import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCtx } from "@/lib/session";
import { signOutAction, switchOrganization } from "@/lib/actions/session";
import { Flash } from "@/components/flash";
import { FeedbackButton } from "@/components/feedback-button";
import { MEMBER_ROLE_LABEL, ORG_TYPE_LABEL } from "@/lib/labels";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getCtx();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-stretch bg-rail">
        <div className="flex w-[var(--spacing-sidebar)] shrink-0 items-center bg-rail px-5">
          <Link href="/home" aria-label="SenecAI Governance Hub — home" className="flex items-center gap-3 rounded-lg">
            <Image src="/images/senecai-mark.png" alt="" width={44} height={46} className="h-11 w-auto" priority />
            <span className="leading-none">
              <span className="block font-display text-[23px] font-semibold tracking-tight text-rail-text">
                Senec<span className="text-gold-light">AI</span>
              </span>
              <span className="mt-1 block font-mono text-[10px] font-medium tracking-micro-wide text-rail-muted">
                GOVERNANCE HUB
              </span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-5 border-l border-rail-line px-8 py-2">
          <span className="mr-auto rounded-full border border-gold-light/40 bg-gold-light/10 px-2.5 py-1 font-mono text-[10.5px] font-medium text-gold-light">
            EU AI ACT
          </span>
          {ctx.memberships.length > 1 ? (
            <form action={switchOrganization} className="flex items-center gap-2">
              <label htmlFor="orgId" className="sr-only">
                Organisation
              </label>
              <select
                id="orgId"
                name="orgId"
                defaultValue={ctx.orgId}
                className="rounded-lg border border-rail-line bg-rail px-2 py-1.5 text-[12.5px] text-rail-text"
              >
                {ctx.memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName} · {MEMBER_ROLE_LABEL[m.role]}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-rail-line px-3 py-1.5 text-[12px] font-semibold text-rail-text hover:border-gold-light">
                Switch
              </button>
            </form>
          ) : (
            <span className="text-[13px] text-rail-muted">
              {ctx.orgName} · {ORG_TYPE_LABEL[ctx.orgType]}
            </span>
          )}
          <span className="flex items-center gap-2.5 text-[13px] text-rail-text">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-gold-light text-[11px] font-semibold text-rail">
              {initials(ctx.userName)}
            </span>
            <span>
              {ctx.userName} <span className="text-rail-muted">· {MEMBER_ROLE_LABEL[ctx.role]}</span>
            </span>
          </span>
          <form action={signOutAction}>
            <button className="rounded-lg border border-rail-line px-3.5 py-2 text-[13px] text-rail-text hover:border-gold-light">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <Suspense>
        <Flash />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
      <FeedbackButton />
    </div>
  );
}

function initials(name: string | null | undefined) {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
