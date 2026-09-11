import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

const REGULATIONS = [
  { label: "AI Act", live: true },
  { label: "GDPR", live: true },
  { label: "NIS2", live: false },
  { label: "DORA", live: false },
  { label: "CRA", live: false },
];

const PIPELINE = [
  { step: 1, label: "Inventory & Classification" },
  { step: 2, label: "Obligations" },
  { step: 3, label: "Gap Assessment" },
  { step: 4, label: "Compliance Roadmap" },
  { step: 5, label: "Tracking" },
];

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static local brand asset
    <img
      src="/images/logo-mark.png"
      alt="SenecAI"
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-6 sm:px-10">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-narrow text-[12px] font-semibold uppercase tracking-micro-wide text-gold-hover">
              SenecAI
            </p>
            <p className="text-[9.5px] leading-[1.25] text-muted">Compliance Governance Hub</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 sm:flex">
          <a href="#modules" className="font-narrow text-[11.5px] font-semibold uppercase tracking-micro-wide text-body hover:text-ink">
            How it works
          </a>
          <a href="#regulations" className="font-narrow text-[11.5px] font-semibold uppercase tracking-micro-wide text-body hover:text-ink">
            Regulations
          </a>
        </nav>
        <Button href="/login" variant="ink" size="sm">
          Sign in
        </Button>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {REGULATIONS.map((r) => (
                <Tag key={r.label} tone={r.live ? "gold-fill" : "muted"}>
                  {r.label}
                </Tag>
              ))}
            </div>
            <h1 className="prose-pretty mt-6 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[52px]">
              One governance layer for EU digital compliance
            </h1>
            <p className="prose-pretty mt-5 max-w-md text-[16px] leading-relaxed text-body">
              Inventory, risk classification, obligations and a compliance roadmap — for every
              AI system and every processing activity, kept in one place and reviewed by a
              consultant before anything is treated as final.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="/login" variant="primary">
                Sign in →
              </Button>
              <p className="text-[12.5px] text-muted">
                Provided to SenecAI clients as part of your engagement.
              </p>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Not a client yet?{" "}
              <a href="https://senecai.eu" className="text-gold-hover underline hover:text-gold-deep">
                Learn more at senecai.eu
              </a>
            </p>
          </div>

          <div>
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-md">
              <div className="flex items-center gap-1.5 border-b border-hairline bg-panel px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-gold-light" />
                <span className="h-2 w-2 rounded-full bg-hairline" />
                <span className="h-2 w-2 rounded-full bg-hairline" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshot, no need for next/image's optimizer here */}
              <img
                src="/images/hero-preview.png"
                alt="AI Act readiness score and compliance roadmap in the SenecAI Governance Hub"
                width={1600}
                height={567}
                className="w-full h-auto"
              />
            </div>
            <p className="mt-3 text-center font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-hover">
              Your readiness score, always up to date
            </p>
          </div>
        </section>

        {/* ── Module pipeline ─────────────────────────────────────────── */}
        <section id="modules" className="border-t border-hairline bg-panel py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <p className="font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-hover">
              How it works
            </p>
            <h2 className="prose-pretty mt-2 max-w-lg text-[28px] font-semibold leading-tight text-ink">
              Your compliance journey, in one place
            </h2>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {PIPELINE.map((p) => (
                <div key={p.step} className="rounded-xl border border-hairline bg-surface p-4 shadow-sm">
                  <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro text-label">
                    Step {p.step}
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-ink">{p.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] text-muted">
              Role and risk classifications are always preliminary until a consultant reviews
              them — the same applies to any auto-generated document.
            </p>
          </div>
        </section>

        {/* ── Regulations ──────────────────────────────────────────────── */}
        <section id="regulations" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <p className="font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-hover">
              Coverage
            </p>
            <h2 className="prose-pretty mt-2 max-w-lg text-[28px] font-semibold leading-tight text-ink">
              AI Act and GDPR today, the full EU stack next
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {REGULATIONS.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3.5 shadow-sm"
                >
                  <span className="text-[13.5px] font-medium text-ink">{r.label}</span>
                  <Tag tone={r.live ? "gold-fill" : "outline"}>{r.live ? "Live" : "Soon"}</Tag>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="text-[12.5px] text-muted">SenecAI Governance Hub</span>
          </div>
          <Link href="/login" className="text-[12.5px] text-gold-hover underline hover:text-gold-deep">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
