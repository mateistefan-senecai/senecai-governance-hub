"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Tag } from "@/components/ui/tag";

// ── Top bar: cross-regulation primary navigation ───────────────────────────

const AI_ACT_PREFIXES = ["/inventory", "/compliance-plan", "/tracking", "/regulatory-watch", "/research"];

function isAiActRoute(pathname: string): boolean {
  return AI_ACT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

type TopBarEntry = {
  label: string;
  href: string;
  active: boolean;
  comingSoon?: boolean;
};

function buildTopBar(pathname: string): TopBarEntry[] {
  return [
    { label: "Overview", href: "/overview", active: pathname.startsWith("/overview") },
    { label: "AI Act", href: "/inventory", active: isAiActRoute(pathname) },
    { label: "GDPR", href: "/gdpr", active: pathname.startsWith("/gdpr"), comingSoon: true },
    { label: "NIS2", href: "/nis2", active: pathname.startsWith("/nis2"), comingSoon: true },
    { label: "DORA", href: "/dora", active: pathname.startsWith("/dora"), comingSoon: true },
    { label: "CRA", href: "/cra", active: pathname.startsWith("/cra"), comingSoon: true },
  ];
}

function TopBar({ pathname }: { pathname: string }) {
  const entries = buildTopBar(pathname);
  return (
    <div className="flex h-11 shrink-0 items-stretch border-b-2 border-ink bg-ink">
      {entries.map((entry) => (
        <Link
          key={entry.href}
          href={entry.href}
          className={`flex items-center gap-2 border-r border-[#3A3428] px-5 font-narrow text-[11.5px] font-semibold uppercase tracking-micro-wide ${
            entry.active ? "bg-gold text-ink" : "text-panel hover:bg-[#241F16]"
          }`}
        >
          {entry.label}
          {entry.comingSoon && (
            <span
              className={`rounded-none border px-1.5 py-0.5 text-[8.5px] normal-case tracking-normal ${
                entry.active ? "border-ink text-ink" : "border-[#5A5240] text-[#A19A8C]"
              }`}
            >
              Coming soon
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

// ── Sidebar: AI Act step nav (only shown while inside the AI Act section) ──

/** /inventory/{id} or /compliance-plan/{id}/... — "new" is a route segment, not a system id. */
function systemIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(?:inventory|compliance-plan)\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "new" ? id : null;
}

type NavEntry = {
  step?: number;
  label: string;
  href: string;
  active: boolean;
  outOfScope?: boolean;
};

function buildAiActNavEntries(pathname: string): NavEntry[] {
  const systemId = systemIdFromPathname(pathname);
  const planBase = systemId ? `/compliance-plan/${systemId}` : "/compliance-plan";

  return [
    {
      step: 1,
      label: "Inventory & Classification",
      href: "/inventory",
      active: pathname.startsWith("/inventory"),
    },
    {
      step: 2,
      label: "Obligations",
      href: systemId ? `${planBase}/obligations` : planBase,
      active: systemId
        ? pathname === `${planBase}/obligations` || pathname.startsWith(`${planBase}/obligations/`)
        : pathname === "/compliance-plan",
    },
    {
      step: 3,
      label: "Gap Assessment",
      href: systemId ? `${planBase}/gap` : planBase,
      active: systemId ? pathname === `${planBase}/gap` : false,
    },
    {
      step: 4,
      label: "Compliance Roadmap",
      href: systemId ? `${planBase}/plan` : planBase,
      active: systemId ? pathname === `${planBase}/plan` : false,
    },
    {
      step: 5,
      label: "Tracking",
      href: "/tracking",
      active: pathname.startsWith("/tracking"),
      outOfScope: true,
    },
    {
      label: "Regulatory Watch",
      href: "/regulatory-watch",
      active: pathname.startsWith("/regulatory-watch"),
      outOfScope: true,
    },
    {
      label: "Research",
      href: "/research",
      active: pathname.startsWith("/research"),
      outOfScope: true,
    },
  ];
}

export function NavShell({
  children,
  orgName,
  email,
  roleLabel,
  canReview,
}: {
  children: ReactNode;
  orgName: string;
  email: string;
  roleLabel: string;
  canReview: boolean;
}) {
  const pathname = usePathname();
  const showAiActNav = isAiActRoute(pathname);
  const navEntries = showAiActNav ? buildAiActNavEntries(pathname) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar pathname={pathname} />
      <div className="flex flex-1">
        <aside className="flex w-sidebar shrink-0 flex-col border-r-2 border-ink bg-panel">
          <div className="bg-ink px-5 pb-5 pt-[22px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- external brand asset, next/image remote-pattern config not worth it here */}
            <img src="https://senecai.eu/logo_white.png" alt="SenecAI" className="h-[26px] w-auto" />
            <p className="mt-3.5 font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-light">
              SenecAI Compliance Governance Hub
            </p>
            <p className="mt-1 text-[11px] italic text-[#A19A8C]">One-stop shop for EU Digital Compliance</p>
            <p className="mt-2.5 text-xs text-[#A19A8C]">{orgName}</p>
          </div>

          {showAiActNav && (
            <nav className="flex flex-col pt-[18px]">
              <p className="px-5 pb-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                AI Act
              </p>
              {navEntries.map((entry) => (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className={`border-l-4 px-5 py-2.5 ${
                    entry.active
                      ? "border-l-gold bg-hairline-light"
                      : "border-l-transparent hover:bg-hairline-light"
                  }`}
                >
                  {entry.step !== undefined && (
                    <span className="block font-narrow text-[10px] font-semibold uppercase tracking-micro text-label">
                      Step {entry.step}
                    </span>
                  )}
                  <span
                    className={`mt-[3px] block text-[13.5px] font-medium ${
                      entry.outOfScope ? "text-disabled" : "text-ink"
                    }`}
                  >
                    {entry.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          <div className="mt-auto border-t-2 border-ink px-5 py-4">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Signed in as
            </p>
            <p className="mt-2.5 truncate text-[13px] text-ink">{email}</p>
            <div className="mt-1.5">
              <Tag tone="ink-fill">{roleLabel}</Tag>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-[1.45] text-muted">
              {canReview
                ? "You can run classifications and approve them as reviewed on behalf of clients."
                : "You can fill in the inventory and gap assessment. A SenecAI consultant reviews classifications before they're binding."}
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-3 text-[12px] text-muted underline hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
