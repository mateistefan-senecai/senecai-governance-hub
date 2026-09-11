import { Archivo } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
});

// Per the design handoff: which regulation modules to surface as "in rollout" is an
// open question for SenecAI (NIS2/DORA/CRA aren't live) — keep this off until confirmed.
const SHOW_COVERAGE = false;
const SHOW_STAT_CHIPS = true;
const SHOW_WORKFLOW_RAIL = true;

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Inventory & Classification",
    body: "Every system and processing activity, with role and risk class.",
  },
  {
    step: 2,
    title: "Obligations",
    body: "The duties that actually apply, article by article.",
  },
  {
    step: 3,
    title: "Gap Assessment",
    body: "One question per obligation; the score updates live.",
  },
  {
    step: 4,
    title: "Compliance Roadmap",
    body: "Gaps become dated actions with named owners.",
  },
  {
    step: 5,
    title: "Tracking",
    body: "Evidence kept current, with Regulatory Watch alongside.",
  },
];

const EXPERT_ROWS = [
  {
    label: "Legal",
    body: "Risk class and legal role reviewed by EU tech counsel before they become your position of record.",
  },
  {
    label: "Technical",
    body: "Data, autonomy and human oversight assessed on the real system, not on the questionnaire answer.",
  },
  {
    label: "Cyber",
    body: "Security measures tested against NIS2 and CRA expectations, then evidenced in the Hub.",
  },
];

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#experts", label: "Experts" },
  ...(SHOW_COVERAGE ? [{ href: "#coverage", label: "Coverage" }] : []),
];

function RequestDemoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href="#demo"
      className={`inline-flex items-center gap-2 rounded-full bg-[#A67C1A] font-bold text-white shadow-[0_2px_8px_rgba(120,88,16,0.22)] transition-colors hover:bg-[#8A6512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A67C1A] focus-visible:outline-offset-2 ${className}`}
    >
      Request Demo
    </a>
  );
}

export function LandingPage() {
  return (
    <div
      className={`${archivo.variable} min-h-screen bg-[#F6F1E7] text-[#1C1A17]`}
      style={{ fontFamily: "var(--font-archivo), system-ui, sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-5 px-6 py-5 sm:px-10">
        <a href="#product" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/images/senecai-logo.png" alt="SenecAI Governance Hub" className="block h-11 w-auto" />
        </a>
        <div className="flex flex-wrap items-center gap-7">
          <nav className="flex flex-wrap gap-6 text-sm font-semibold text-[#5E594F]">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[#8A6512]">
                {link.label}
              </a>
            ))}
          </nav>
          <RequestDemoLink className="px-[22px] py-3 text-[13px]" />
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-16 text-center sm:px-10">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-[#EFE7D4] py-1.5 pl-3.5 pr-2">
          <span className="text-xs font-semibold text-[#6E6758]">Covering</span>
          <span className="rounded-full bg-[#A67C1A] px-3.5 py-1.5 text-[11.5px] font-bold tracking-[0.08em] text-white">
            AI ACT
          </span>
          <span className="rounded-full bg-[#A67C1A] px-3.5 py-1.5 text-[11.5px] font-bold tracking-[0.08em] text-white">
            GDPR
          </span>
        </div>

        <h1
          className="mt-[26px] max-w-[15ch] font-extrabold leading-[1.02] tracking-[-0.034em] text-balance"
          style={{ fontSize: "clamp(38px, 6.2vw, 70px)" }}
        >
          One Hub for All Digital Compliance
        </h1>

        <p
          className="mt-[22px] max-w-[30ch] font-bold leading-[1.35] text-[#6E5A22]"
          style={{ fontSize: "clamp(18px, 2.1vw, 24px)" }}
        >
          Keep track of every AI system, every processing activity, and every obligation — all in
          one place.
        </p>

        <p className="mt-[18px] max-w-[54ch] text-base leading-[1.55] text-[#7C766B]">
          Role and risk classifications, gap answers and readiness scores, kept current and
          reviewed by a consultant before anything counts as final.
        </p>

        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-3.5">
          <RequestDemoLink className="px-[30px] py-[17px] text-base shadow-[0_4px_14px_rgba(120,88,16,0.25)]" />
          <a
            href="#workflow"
            className="rounded-xl border border-[#D8CDB4] bg-[#FFFDF8] px-[26px] py-4 text-base font-bold text-[#1C1A17] transition-colors hover:bg-[#F3E9CF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A67C1A] focus-visible:outline-offset-2"
          >
            See the workflow
          </a>
        </div>
      </div>

      {/* ── Product stage ──────────────────────────────────────────────── */}
      <div
        id="product"
        className="mx-6 mt-[52px] rounded-3xl px-7 pt-10 sm:mx-6"
        style={{ background: "linear-gradient(180deg, #EFE7D4 0%, #F6F1E7 100%)" }}
      >
        {SHOW_STAT_CHIPS && (
          <div className="mb-[26px] flex flex-wrap justify-center gap-3">
            <div className="rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] px-5 py-3.5 shadow-[0_4px_14px_rgba(60,48,20,0.07)]">
              <div className="text-[22px] font-extrabold">14</div>
              <div className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378]">
                APPLICABLE OBLIGATIONS
              </div>
            </div>
            <div className="rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] px-5 py-3.5 shadow-[0_4px_14px_rgba(60,48,20,0.07)]">
              <div className="text-[22px] font-extrabold text-[#A67C1A]">89%</div>
              <div className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378]">
                LIVE COMPLIANCE SCORE
              </div>
            </div>
            <div className="rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] px-5 py-3.5 shadow-[0_4px_14px_rgba(60,48,20,0.07)]">
              <div className="text-[22px] font-extrabold">3</div>
              <div className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378]">
                OPEN GAPS
              </div>
            </div>
          </div>
        )}
        <div
          className="overflow-hidden rounded-t-2xl border border-b-0 border-[#E4DCC9] bg-[#FBF8F1]"
          style={{ boxShadow: "0 -2px 40px rgba(60,48,20,0.16)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshot */}
          <img
            src="/images/hub-gap-assessment.png"
            alt="Gap assessment in the SenecAI Governance Hub"
            className="block h-auto w-full"
          />
        </div>
      </div>

      {/* ── Workflow rail ──────────────────────────────────────────────── */}
      {SHOW_WORKFLOW_RAIL && (
        <div id="workflow" className="px-6 pt-[60px] sm:px-10">
          <div className="mb-7 text-center">
            <div className="text-[10.5px] font-bold tracking-[0.2em] text-[#A67C1A]">
              THE WORKFLOW
            </div>
            <h2
              className="mt-2.5 font-extrabold tracking-[-0.025em]"
              style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}
            >
              Five steps from unknown to audit-ready
            </h2>
          </div>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] px-[18px] py-[22px]">
                <div className="text-[11px] font-bold tracking-[0.14em] text-[#A67C1A]">
                  STEP {s.step}
                </div>
                <h3 className="mb-[7px] mt-2 text-base font-extrabold">{s.title}</h3>
                <p className="text-[13px] leading-[1.5] text-[#7C766B]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Experts in the loop ────────────────────────────────────────── */}
      <div id="experts" className="px-6 pt-14 sm:px-10">
        <div
          className="grid gap-[34px] rounded-[20px] border border-[#EBE3D2] bg-[#FFFDF8] p-[38px]"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
        >
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.2em] text-[#A67C1A]">
              EXPERTS IN THE LOOP
            </div>
            <h2
              className="mb-3 mt-3 font-extrabold leading-[1.1] tracking-[-0.025em]"
              style={{ fontSize: "clamp(24px, 3vw, 32px)" }}
            >
              Nothing counts as final until a consultant reviews it
            </h2>
            <p className="text-[15px] leading-[1.6] text-[#7C766B]">
              The Hub does the structure and the arithmetic. SenecAI&rsquo;s people take the
              position — and put their name on it.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {EXPERT_ROWS.map((row) => (
              <div key={row.label} className="flex items-start gap-4 rounded-2xl bg-[#F6F1E7] px-5 py-[18px]">
                <span className="min-w-[74px] pt-[3px] text-[11px] font-bold tracking-[0.12em] text-[#A67C1A]">
                  {row.label.toUpperCase()}
                </span>
                <p className="text-[14.5px] leading-[1.5] text-[#3F3B34]">{row.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Coverage strip ─────────────────────────────────────────────── */}
      {SHOW_COVERAGE && (
        <div id="coverage" className="px-6 pt-[26px] sm:px-10">
          <div className="flex flex-wrap items-center gap-7 rounded-[20px] border border-[#EBE3D2] bg-[#FFFDF8] px-[34px] py-[30px]">
            <div className="min-w-[260px]">
              <div className="text-[10.5px] font-bold tracking-[0.2em] text-[#A67C1A]">
                REGULATIONS COVERED
              </div>
              <h2 className="mt-2.5 text-2xl font-extrabold tracking-[-0.02em]">
                Live today, more in rollout
              </h2>
            </div>
            <div className="ml-auto flex flex-wrap gap-2.5">
              <span className="rounded-full border border-[#D8CDB4] bg-[#F6F1E7] px-[18px] py-[11px] text-[13px] font-bold">
                EU AI Act
              </span>
              <span className="rounded-full border border-[#D8CDB4] bg-[#F6F1E7] px-[18px] py-[11px] text-[13px] font-bold">
                GDPR
              </span>
              <span className="rounded-full border border-dashed border-[#D8CDB4] px-[18px] py-[11px] text-[13px] font-semibold text-[#9A9285]">
                NIS2
              </span>
              <span className="rounded-full border border-dashed border-[#D8CDB4] px-[18px] py-[11px] text-[13px] font-semibold text-[#9A9285]">
                DORA
              </span>
              <span className="rounded-full border border-dashed border-[#D8CDB4] px-[18px] py-[11px] text-[13px] font-semibold text-[#9A9285]">
                CRA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <div id="demo" className="flex flex-col items-center px-6 pb-6 pt-14 text-center sm:px-10">
        <h2
          className="max-w-[22ch] font-extrabold tracking-[-0.03em]"
          style={{ fontSize: "clamp(30px, 4vw, 42px)" }}
        >
          Start with your own register
        </h2>
        <p className="mt-3.5 max-w-[44ch] text-base leading-[1.55] text-[#7C766B]">
          Thirty minutes with a lawyer and an engineer. You leave with a scoped list of what
          applies to you.
        </p>
        <RequestDemoLink className="mt-[26px] px-[30px] py-[17px] text-base shadow-[0_4px_14px_rgba(120,88,16,0.25)]" />
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mx-6 mt-6 flex flex-wrap items-center justify-between gap-5 border-t border-[#EBE3D2] px-0 py-9 sm:mx-10">
        <span className="text-[13px] text-[#8A8378]">© 2026 SenecAI Compliance · Governance Hub</span>
        <div className="flex gap-[22px] text-[13px] font-semibold">
          {SHOW_COVERAGE && (
            <a href="#coverage" className="text-[#A67C1A] hover:text-[#8A6512]">
              Coverage
            </a>
          )}
          <a href="#experts" className="text-[#A67C1A] hover:text-[#8A6512]">
            Experts
          </a>
          <a href="#demo" className="text-[#A67C1A] hover:text-[#8A6512]">
            Request a demo
          </a>
        </div>
      </footer>
    </div>
  );
}
