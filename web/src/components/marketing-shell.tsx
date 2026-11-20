import { Archivo } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

// Shared frame of the public pages ("/" and /request-demo): the warm cream
// look of the original design handoff, Archivo, gold accents.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
});

export const NAV_LINKS = [
  { href: "/#workflow", label: "How it works" },
  { href: "/#who", label: "Who it's for" },
  { href: "/#deliverables", label: "Deliverables" },
  { href: "/#principles", label: "Principles" },
];

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A67C1A] focus-visible:outline-offset-2";

export function RequestDemoLink({ className = "", children = "Request a demo" }: { className?: string; children?: ReactNode }) {
  return (
    <Link
      href="/request-demo"
      className={`inline-flex items-center gap-2 rounded-full bg-[#A67C1A] font-bold text-white shadow-[0_2px_8px_rgba(120,88,16,0.22)] transition-colors hover:bg-[#8A6512] ${FOCUS} ${className}`}
    >
      {children}
    </Link>
  );
}

export function MarketingShell({ children, showDemoButton = true }: { children: ReactNode; showDemoButton?: boolean }) {
  return (
    <div
      className={`${archivo.variable} min-h-screen overflow-x-hidden bg-[#F6F1E7] text-[#1C1A17]`}
      style={{ fontFamily: "var(--font-archivo), system-ui, sans-serif" }}
    >
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-5 sm:px-10">
        <Link href="/" className={`block rounded ${FOCUS}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/images/senecai-logo.png" alt="SenecAI Governance Hub" className="block h-10 w-auto sm:h-11" />
        </Link>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <nav aria-label="Main" className="hidden flex-wrap gap-6 text-sm font-semibold text-[#5E594F] md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={`rounded hover:text-[#8A6512] ${FOCUS}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className={`rounded text-sm font-semibold text-[#5E594F] hover:text-[#8A6512] ${FOCUS}`}>
              Sign in
            </Link>
            {showDemoButton && <RequestDemoLink className="px-[20px] py-2.5 text-[13px]" />}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mx-4 mt-10 flex max-w-[1200px] flex-wrap items-center justify-between gap-5 border-t border-[#EBE3D2] py-9 sm:mx-10 xl:mx-auto">
        <span className="text-[13px] text-[#8A8378]">© 2026 SenecAI · Governance Hub · EU AI Act</span>
        <div className="flex flex-wrap gap-x-[22px] gap-y-2 text-[13px] font-semibold">
          <a href="https://www.senecai.eu/" className={`rounded text-[#A67C1A] hover:text-[#8A6512] ${FOCUS}`}>
            senecai.eu
          </a>
          <a href="https://www.senecai.eu/privacy-policy" className={`rounded text-[#A67C1A] hover:text-[#8A6512] ${FOCUS}`}>
            Privacy policy
          </a>
          <a href="https://www.senecai.eu/legal-notice" className={`rounded text-[#A67C1A] hover:text-[#8A6512] ${FOCUS}`}>
            Legal notice
          </a>
          <Link href="/login" className={`rounded text-[#A67C1A] hover:text-[#8A6512] ${FOCUS}`}>
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
