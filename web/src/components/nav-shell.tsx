"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const modules = [
  { href: "/inventory", label: "1. Inventory & Risk Classification", status: "active" as const },
  { href: "/compliance-plan", label: "2. Compliance Plan", status: "active" as const },
  { href: "/tracking", label: "3. Tracking", status: "placeholder" as const },
  { href: "/regulatory-watch", label: "4. Regulatory Watch", status: "placeholder" as const },
];

export function NavShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-sm font-semibold text-slate-900">SenecAI Governance Hub</p>
          <p className="text-xs text-slate-500">AI Act module — MVP</p>
        </div>
        <nav className="space-y-1">
          {modules.map((m) => {
            const isActive = pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : m.status === "placeholder"
                      ? "text-slate-400 hover:bg-slate-50"
                      : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {m.label}
                {m.status === "placeholder" && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide">soon</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-10 border-t border-slate-200 pt-4 px-2">
          <p className="text-xs text-slate-500">{userLabel}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 text-sm text-slate-600 underline hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
