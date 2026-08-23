"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Tag } from "@/components/ui/tag";

type NavEntry = {
  kicker: string;
  label: string;
  href: string;
  active: boolean;
  outOfScope?: boolean;
};

/** /inventory/{id} or /compliance-plan/{id}/... — "new" is a route segment, not a system id. */
function systemIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(?:inventory|compliance-plan)\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "new" ? id : null;
}

function buildNavEntries(pathname: string): NavEntry[] {
  const systemId = systemIdFromPathname(pathname);
  const module2Base = systemId ? `/compliance-plan/${systemId}` : "/compliance-plan";

  const module2Entries: NavEntry[] = systemId
    ? [
        {
          kicker: "Module 2",
          label: "Obligations",
          href: `${module2Base}/obligations`,
          active: pathname === `${module2Base}/obligations`,
        },
        {
          kicker: "Module 2",
          label: "Gap assessment",
          href: `${module2Base}/gap`,
          active: pathname === `${module2Base}/gap`,
        },
        {
          kicker: "Module 2",
          label: "Plan & Readiness",
          href: `${module2Base}/plan`,
          active: pathname === `${module2Base}/plan`,
        },
      ]
    : [
        {
          kicker: "Module 2",
          label: "Compliance Plan",
          href: "/compliance-plan",
          active: pathname.startsWith("/compliance-plan"),
        },
      ];

  return [
    {
      kicker: "Module 1",
      label: "Inventory & Classification",
      href: "/inventory",
      active: pathname.startsWith("/inventory"),
    },
    ...module2Entries,
    {
      kicker: "Module 3",
      label: "Tracking",
      href: "/tracking",
      active: pathname.startsWith("/tracking"),
      outOfScope: true,
    },
    {
      kicker: "Module 4",
      label: "Regulatory Watch",
      href: "/regulatory-watch",
      active: pathname.startsWith("/regulatory-watch"),
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
  const navEntries = buildNavEntries(pathname);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-sidebar shrink-0 flex-col border-r-2 border-ink bg-panel">
        <div className="bg-ink px-5 pb-5 pt-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- external brand asset, next/image remote-pattern config not worth it here */}
          <img src="https://senecai.eu/logo_white.png" alt="SenecAI" className="h-[26px] w-auto" />
          <p className="mt-3.5 font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-light">
            Governance Hub
          </p>
          <p className="mt-1 text-xs text-[#A19A8C]">{orgName}</p>
        </div>

        <nav className="flex flex-col pt-[18px]">
          <p className="px-5 pb-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
            Modules
          </p>
          {navEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className={`border-l-4 px-5 py-2.5 ${
                entry.active
                  ? "border-l-gold bg-hairline-light"
                  : "border-l-transparent hover:bg-hairline-light"
              }`}
            >
              <span className="block font-narrow text-[10px] font-semibold uppercase tracking-micro text-label">
                {entry.kicker}
              </span>
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
  );
}
