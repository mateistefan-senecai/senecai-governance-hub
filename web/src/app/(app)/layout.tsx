import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCtx } from "@/lib/session";
import { signOutAction, switchOrganization } from "@/lib/actions/session";
import { Flash } from "@/components/flash";
import { MEMBER_ROLE_LABEL, ORG_TYPE_LABEL } from "@/lib/labels";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getCtx();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-stretch">
        <div className="flex w-[var(--spacing-sidebar)] shrink-0 items-center gap-3 bg-rail px-5">
          <Link href="/home" className="rounded-lg bg-white px-2 py-1 shadow-sm">
            <Image src="/images/senecai-logo-white.png" alt="SenecAI Governance Hub" width={124} height={32} className="h-7 w-auto" priority />
          </Link>
          <span className="rounded-full border border-gold-light/35 bg-gold-light/15 px-2 py-0.5 font-mono text-[10px] font-medium text-gold-light">
            EU AI ACT
          </span>
        </div>

        <div className="glass flex flex-1 flex-wrap items-center justify-end gap-5 border-b border-ink/10 px-8 py-2">
          {ctx.memberships.length > 1 ? (
            <form action={switchOrganization} className="flex items-center gap-2">
              <label htmlFor="orgId" className="sr-only">
                Organisation
              </label>
              <select
                id="orgId"
                name="orgId"
                defaultValue={ctx.orgId}
                className="rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-[12.5px] text-ink"
              >
                {ctx.memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName} · {MEMBER_ROLE_LABEL[m.role]}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-ink/40">
                Switch
              </button>
            </form>
          ) : (
            <span className="text-[13px] text-muted">
              {ctx.orgName} · {ORG_TYPE_LABEL[ctx.orgType]}
            </span>
          )}
          <span className="flex items-center gap-2.5 text-[13px] text-ink">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-rail-text">
              {initials(ctx.userName)}
            </span>
            <span>
              {ctx.userName} <span className="text-label">· {MEMBER_ROLE_LABEL[ctx.role]}</span>
            </span>
          </span>
          <form action={signOutAction}>
            <button className="rounded-lg border border-ink/15 px-3.5 py-2 text-[13px] text-ink hover:border-ink/40">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <Suspense>
        <Flash />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
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
