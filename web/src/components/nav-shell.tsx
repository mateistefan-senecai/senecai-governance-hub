"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Tag } from "@/components/ui/tag";
import { LoadDemoDataButton } from "@/components/load-demo-data-button";

// ── Top bar: cross-regulation primary navigation ───────────────────────────

const AI_ACT_PREFIXES = ["/inventory", "/compliance-plan", "/tracking", "/regulatory-watch", "/research"];
const GDPR_PREFIXES = ["/gdpr"];

function isAiActRoute(pathname: string): boolean {
  return AI_ACT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isGdprRoute(pathname: string): boolean {
  return GDPR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
    { label: "GDPR", href: "/gdpr/inventory", active: isGdprRoute(pathname) },
    { label: "NIS2", href: "/nis2", active: pathname.startsWith("/nis2"), comingSoon: true },
    { label: "DORA", href: "/dora", active: pathname.startsWith("/dora"), comingSoon: true },
    { label: "CRA", href: "/cra", active: pathname.startsWith("/cra"), comingSoon: true },
  ];
}

function TopBar({ pathname }: { pathname: string }) {
  const entries = buildTopBar(pathname);
  return (
    <header className="flex h-16 shrink-0 items-stretch bg-ink shadow-sm">
      <div className="flex w-sidebar shrink-0 items-center gap-3 border-r border-white/10 px-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- external brand asset, next/image remote-pattern config not worth it here */}
        <img src="https://senecai.eu/logo_white.png" alt="SenecAI" className="h-6 w-auto shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="font-narrow text-[12px] font-semibold uppercase tracking-micro-wide text-gold-light">
            SenecAI
          </p>
          <p className="text-[9.5px] leading-[1.25] text-white/50">Compliance Governance Hub</p>
        </div>
      </div>
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className={`flex items-center gap-2 border-r border-white/10 px-5 font-narrow text-[11.5px] font-semibold uppercase tracking-micro-wide transition-colors ${
              entry.active ? "bg-gold text-white" : "text-panel/90 hover:bg-white/5"
            }`}
          >
            {entry.label}
            {entry.comingSoon && (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[8.5px] normal-case tracking-normal ${
                  entry.active ? "border-white/40 text-white" : "border-white/15 text-white/50"
                }`}
              >
                Coming soon
              </span>
            )}
          </Link>
        ))}
      </div>
    </header>
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

/** /gdpr/inventory/{id} or /gdpr/compliance-plan/{id}/... — "new" is a route segment, not an activity id. */
function activityIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/gdpr\/(?:inventory|compliance-plan)\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "new" ? id : null;
}

function buildGdprNavEntries(pathname: string): NavEntry[] {
  const activityId = activityIdFromPathname(pathname);
  const planBase = activityId ? `/gdpr/compliance-plan/${activityId}` : "/gdpr/compliance-plan";

  return [
    {
      step: 1,
      label: "Processing Inventory & Classification",
      href: "/gdpr/inventory",
      active: pathname.startsWith("/gdpr/inventory"),
    },
    {
      step: 2,
      label: "Obligations",
      href: activityId ? `${planBase}/obligations` : planBase,
      active: activityId
        ? pathname === `${planBase}/obligations` || pathname.startsWith(`${planBase}/obligations/`)
        : pathname === "/gdpr/compliance-plan",
    },
    {
      step: 3,
      label: "Gap Assessment",
      href: activityId ? `${planBase}/gap` : planBase,
      active: activityId ? pathname === `${planBase}/gap` : false,
    },
    {
      step: 4,
      label: "Compliance Roadmap & Reports",
      href: activityId ? `${planBase}/plan` : planBase,
      active: activityId ? pathname === `${planBase}/plan` : false,
    },
    {
      step: 5,
      label: "Tracking & DSAR Log",
      href: "/gdpr/tracking",
      active: pathname.startsWith("/gdpr/tracking"),
    },
  ];
}

export function NavShell({
  children,
  orgName,
  email,
  roleLabel,
  canReview,
  isSenecaiAdmin,
}: {
  children: ReactNode;
  orgName: string;
  email: string;
  roleLabel: string;
  canReview: boolean;
  isSenecaiAdmin: boolean;
}) {
  const pathname = usePathname();
  const showAiActNav = isAiActRoute(pathname);
  const showGdprNav = isGdprRoute(pathname);
  const navEntries = showAiActNav ? buildAiActNavEntries(pathname) : showGdprNav ? buildGdprNavEntries(pathname) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar pathname={pathname} />
      <div className="flex flex-1">
        <aside className="flex w-sidebar shrink-0 flex-col border-r border-hairline bg-panel">
          <div className="border-b border-hairline px-5 py-4">
            <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Organization
            </p>
            <p className="mt-1 truncate text-[13px] font-medium text-ink">{orgName}</p>
          </div>

          {(showAiActNav || showGdprNav) && (
            <nav className="flex flex-col gap-0.5 p-2.5 pt-[18px]">
              <p className="px-2.5 pb-2 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
                {showAiActNav ? "AI Act" : "GDPR"}
              </p>
              {navEntries.map((entry) => (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className={`rounded-lg px-3.5 py-2.5 transition-colors ${
                    entry.active ? "bg-gold-tint shadow-sm" : "hover:bg-row-hover"
                  }`}
                >
                  {entry.step !== undefined && (
                    <span className="block font-narrow text-[10px] font-semibold uppercase tracking-micro text-label">
                      Step {entry.step}
                    </span>
                  )}
                  <span
                    className={`mt-[3px] block text-[13.5px] font-medium ${
                      entry.outOfScope ? "text-disabled" : entry.active ? "text-gold-deep" : "text-ink"
                    }`}
                  >
                    {entry.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          <div className="mt-auto border-t border-hairline px-5 py-4">
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
            {isSenecaiAdmin && <LoadDemoDataButton />}
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
