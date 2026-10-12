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
      <header className="flex h-14 shrink-0 items-center gap-6 bg-ink px-6 text-panel">
        <Link href="/home" className="rounded-md bg-ground px-2 py-1">
          <Image src="/images/senecai-logo.png" alt="SenecAI Governance Hub" width={124} height={32} className="h-8 w-auto" priority />
        </Link>
        <span className="font-narrow text-[11px] font-semibold uppercase tracking-micro text-disabled">EU AI Act</span>

        <div className="ml-auto flex items-center gap-5">
          {ctx.memberships.length > 1 ? (
            <form action={switchOrganization} className="flex items-center gap-2">
              <label htmlFor="orgId" className="sr-only">
                Organisation
              </label>
              <select
                id="orgId"
                name="orgId"
                defaultValue={ctx.orgId}
                className="rounded-md border border-ink-hover bg-ink-hover px-2 py-1 text-[12.5px] text-panel"
              >
                {ctx.memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName} · {MEMBER_ROLE_LABEL[m.role]}
                  </option>
                ))}
              </select>
              <button className="rounded-md border border-ink-hover px-2 py-1 text-[11.5px] font-semibold hover:border-gold-light">
                Switch
              </button>
            </form>
          ) : (
            <span className="text-[12.5px] text-hairline">
              {ctx.orgName} <span className="text-disabled">· {ORG_TYPE_LABEL[ctx.orgType]}</span>
            </span>
          )}
          <span className="text-[12.5px]">
            {ctx.userName} <span className="text-disabled">· {MEMBER_ROLE_LABEL[ctx.role]}</span>
          </span>
          <form action={signOutAction}>
            <button className="text-[12px] text-hairline underline-offset-2 hover:text-gold-light hover:underline">
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
