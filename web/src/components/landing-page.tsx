import Link from "next/link";
import { MarketingShell, RequestDemoLink } from "./marketing-shell";

// Public landing page at "/" for signed-out visitors. Copy follows the spec
// (docs/spec/ai-act-product-specification-v2.md): EU AI Act only, firms and
// companies as users, deterministic classification, named reviewers. It only
// claims what the Hub does today; the evidence step is marked as coming.

const STEPS = [
  {
    n: "0",
    title: "Applicability check",
    body: "Where the company is established, its size and sector, how it builds or uses AI. It says whether the AI Act applies, and on which provision.",
  },
  {
    n: "1",
    title: "AI inventory",
    body: "Every system built, bought or embedded, with its owner, supplier, purpose and data, and a vendor register of the documents to request.",
  },
  {
    n: "2",
    title: "Risk classification",
    body: "The company's role, the Article 5 screen, the Article 6 high-risk test and Article 50 duties, with the reasoning behind each answer.",
  },
  {
    n: "3",
    title: "Obligation mapping",
    body: "The duties that follow, split between provider and deployer, each with its article and the date from which it applies.",
  },
  {
    n: "4",
    title: "Evidence",
    body: "What would show each obligation is met. Uploading evidence and rating its quality is the next part of the Hub to be built.",
    soon: true,
  },
  {
    n: "5",
    title: "Gap assessment",
    body: "Compliant, partial or gap for every obligation, with the reviewer's rationale and a readiness score per system.",
  },
  {
    n: "6",
    title: "Compliance roadmap",
    body: "Gaps become actions in phases, each with an owner and a deadline, and a way to request help with implementation.",
  },
];

const AUDIENCES = [
  {
    label: "For law firms and consultancies",
    title: "Run your AI Act engagements in your own workspace",
    points: [
      "Your clients, your team, and your lawyers as the reviewers.",
      "Nothing in your workspace is visible to SenecAI or to any other firm.",
      "Deliverables carry your firm's name.",
      "One structure for every client, so there is no spreadsheet running alongside the engagement.",
    ],
  },
  {
    label: "For companies",
    title: "Keep your AI systems and obligations in one register",
    points: [
      "Land on your inventory and see each system's classification, open obligations and next actions.",
      "Work on your own, or invite a SenecAI consultant or your own lawyer into your organisation.",
      "Follow the status of every document prepared for you.",
      "When a system changes, its classification reopens automatically.",
    ],
  },
];

const DELIVERABLES = [
  ["AI inventory", "Every AI system, with owner, supplier, purpose, data, deployment and the company's role.", "Arts. 3, 4, 26"],
  ["Risk classification", "Role, prohibited-practice screen, high-risk test and transparency duties, with the reasoning.", "Arts. 5, 6, 50 · Annexes I, III"],
  ["Obligation mapping", "The obligations that follow for each system, who carries them, and the date each applies.", "Arts. 8–27, 43, 47–49, 72, 73"],
  ["Gap assessment", "Each obligation scored compliant, partial or gap, with a readiness score and the reasons.", "Same, per obligation"],
  ["Compliance roadmap", "Prioritised actions in phases, tagged legal or technical, with owner, deadline and status.", "Every gap in the assessment"],
];

const PRINCIPLES = [
  {
    label: "Deterministic",
    body: "Role, risk class, obligations and dates come from versioned legal content. The reviewer sees every rule that fired, with its article. AI does not decide.",
  },
  {
    label: "Reviewed",
    body: "Every document moves from draft to in review, approved and released. Only a named reviewer can approve it, and every change is in the audit log.",
  },
  {
    label: "Isolated",
    body: "Each organisation's data is separated in the database itself. A firm's clients are never visible to another firm, or to SenecAI.",
  },
];

const EYEBROW = "text-[10.5px] font-bold tracking-[0.2em] text-[#A67C1A]";
const CARD = "rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8]";
const SECTION = "mx-auto max-w-[1200px] px-4 sm:px-10";

export function LandingPage() {
  return (
    <MarketingShell>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center px-4 pt-12 text-center sm:px-10 sm:pt-16">
        <div className="flex items-center gap-2 rounded-full bg-[#EFE7D4] py-1.5 pl-3.5 pr-2">
          <span className="text-xs font-semibold text-[#6E6758]">Built for</span>
          <span className="rounded-full bg-[#A67C1A] px-3.5 py-1.5 text-[11.5px] font-bold tracking-[0.08em] text-white">
            THE EU AI ACT
          </span>
        </div>

        <h1
          className="mt-[26px] max-w-[17ch] font-extrabold leading-[1.04] tracking-[-0.034em] text-balance"
          style={{ fontSize: "clamp(36px, 6vw, 66px)" }}
        >
          From &ldquo;does the AI Act apply?&rdquo; to a reviewed roadmap
        </h1>

        <p
          className="mt-[22px] max-w-[36ch] font-bold leading-[1.35] text-[#6E5A22] text-balance"
          style={{ fontSize: "clamp(18px, 2.1vw, 23px)" }}
        >
          Inventory every AI system, classify it, map its obligations and turn the gaps into a plan,
          all in one workspace.
        </p>

        <p className="mt-[18px] max-w-[58ch] text-base leading-[1.55] text-[#7C766B]">
          The Governance Hub is the delivery tool for AI Act engagements, for the lawyers and
          consultants who run them and the companies they advise. Nothing reaches a client as
          approved until a named reviewer has signed it off.
        </p>

        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-3.5">
          <RequestDemoLink className="px-[30px] py-[17px] text-base shadow-[0_4px_14px_rgba(120,88,16,0.25)]" />
          <Link
            href="#workflow"
            className="rounded-xl border border-[#D8CDB4] bg-[#FFFDF8] px-[26px] py-4 text-base font-bold transition-colors hover:bg-[#F3E9CF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A67C1A] focus-visible:outline-offset-2"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* ── Product stage ──────────────────────────────────────────────── */}
      <section aria-label="The inventory" className="mx-auto mt-[52px] max-w-[1200px] px-4 sm:px-6">
        <div
          className="rounded-3xl px-3 pt-8 sm:px-7 sm:pt-10"
          style={{ background: "linear-gradient(180deg, #EFE7D4 0%, #F6F1E7 100%)" }}
        >
          <p className="mx-auto mb-6 max-w-[60ch] text-center text-[15px] leading-[1.55] text-[#5E594F]">
            <strong className="text-[#1C1A17]">The inventory is the workspace.</strong> Each system shows its
            classification, open obligations and next actions. From a system to an obligation and
            back takes two clicks.
          </p>
          <div
            className="overflow-hidden rounded-t-2xl border border-b-0 border-[#E4DCC9] bg-[#FBF8F1]"
            style={{ boxShadow: "0 -2px 40px rgba(60,48,20,0.16)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshot */}
            <img
              src="/images/hub-inventory.png"
              alt="A client's AI inventory in the Governance Hub: each system with its role, risk class, open obligations and status"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Workflow ───────────────────────────────────────────────────── */}
      <section id="workflow" className={`${SECTION} scroll-mt-6 pt-[64px]`}>
        <div className="mb-8 text-center">
          <div className={EYEBROW}>HOW IT WORKS</div>
          <h2 className="mt-2.5 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>
            An applicability check, then six steps in order
          </h2>
          <p className="mx-auto mt-3 max-w-[56ch] text-[15px] leading-[1.55] text-[#7C766B]">
            Each step builds on the one before. Classification and obligation mapping feel like one
            step, because the obligations follow from the classification automatically.
          </p>
        </div>
        <ol className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" }}>
          {STEPS.map((s) => (
            <li key={s.n} className={`${CARD} px-[18px] py-[22px] ${s.soon ? "border-dashed" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-[0.14em] text-[#A67C1A]">
                  {s.n === "0" ? "FIRST" : `STEP ${s.n}`}
                </span>
                {s.soon && (
                  <span className="rounded-full bg-[#EFE7D4] px-2.5 py-1 text-[10.5px] font-bold tracking-[0.08em] text-[#6E6758]">
                    COMING NEXT
                  </span>
                )}
              </div>
              <h3 className="mb-[7px] mt-2 text-base font-extrabold">{s.title}</h3>
              <p className="text-[13.5px] leading-[1.5] text-[#7C766B]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Who it's for ───────────────────────────────────────────────── */}
      <section id="who" className={`${SECTION} scroll-mt-6 pt-[64px]`}>
        <div className="mb-8 text-center">
          <div className={EYEBROW}>WHO IT&rsquo;S FOR</div>
          <h2 className="mt-2.5 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>
            One set of data, three kinds of user
          </h2>
          <p className="mx-auto mt-3 max-w-[60ch] text-[15px] leading-[1.55] text-[#7C766B]">
            Lawyers, consultants and the companies they work for share the same data. Roles decide
            who can edit and who can approve.
          </p>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
          {AUDIENCES.map((a) => (
            <div key={a.label} className={`${CARD} p-7 sm:p-[34px]`}>
              <div className={EYEBROW}>{a.label.toUpperCase()}</div>
              <h3 className="mt-3 text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em]">{a.title}</h3>
              <ul className="mt-5 space-y-3">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[14.5px] leading-[1.5] text-[#3F3B34]">
                    <span aria-hidden className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#A67C1A]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Deliverables ───────────────────────────────────────────────── */}
      <section id="deliverables" className={`${SECTION} scroll-mt-6 pt-[64px]`}>
        <div className={`${CARD} grid gap-8 p-7 sm:p-[38px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
          <div>
            <div className={EYEBROW}>DELIVERABLES</div>
            <h2 className="mt-3 font-extrabold leading-[1.12] tracking-[-0.025em]" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>
              Five PDFs a client can keep, file or send to an auditor
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#7C766B]">
              Each one is generated from the record, so it always matches the screen. It is a dated,
              versioned snapshot showing its status, the reviewer and the version of the legal
              content behind it. When the record changes, the PDF is marked outdated and a new
              version is made. Nobody edits an old one. All five also come as one combined pack.
            </p>
          </div>
          <ul className="divide-y divide-[#EBE3D2] rounded-2xl bg-[#F6F1E7] px-5">
            {DELIVERABLES.map(([name, body, cite]) => (
              <li key={name} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <span className="text-[14.5px] font-extrabold">{name}</span>
                <span>
                  <span className="block text-[14px] leading-[1.5] text-[#3F3B34]">{body}</span>
                  <span className="mt-1 block text-[11.5px] font-semibold tracking-[0.04em] text-[#8A8378]">{cite}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Principles ─────────────────────────────────────────────────── */}
      <section id="principles" className={`${SECTION} scroll-mt-6 pt-[26px]`}>
        <div className={`${CARD} grid gap-8 p-7 sm:p-[38px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
          <div>
            <div className={EYEBROW}>PRINCIPLES</div>
            <h2 className="mt-3 font-extrabold leading-[1.12] tracking-[-0.025em]" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>
              The Hub structures the work. A named professional signs it off.
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#7C766B]">
              Where the law is concerned, the answers are rules you can check, not text a model
              wrote. The reviewer can override a result, but only with a written reason that stays on
              the record.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {PRINCIPLES.map((row) => (
              <div key={row.label} className="flex flex-col gap-1.5 rounded-2xl bg-[#F6F1E7] px-5 py-[18px] sm:flex-row sm:gap-4">
                <span className="min-w-[104px] pt-[3px] text-[11px] font-bold tracking-[0.12em] text-[#A67C1A]">
                  {row.label.toUpperCase()}
                </span>
                <p className="text-[14.5px] leading-[1.5] text-[#3F3B34]">{row.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Implementation ─────────────────────────────────────────────── */}
      <section className={`${SECTION} pt-[26px]`}>
        <div className="flex flex-col gap-5 rounded-2xl bg-[#1C1A17] p-7 text-[#F6F1E7] sm:flex-row sm:items-center sm:justify-between sm:p-[34px]">
          <div className="max-w-[62ch]">
            <div className="text-[10.5px] font-bold tracking-[0.2em] text-[#D9B860]">WHEN YOU NEED HANDS-ON HELP</div>
            <p className="mt-2.5 text-[15.5px] leading-[1.6] text-[#E9E2D2]">
              Legal and technical implementation stays a human service. Any roadmap action can be sent
              to SenecAI as a scoped request, or to a firm&rsquo;s own team. The roadmap is complete
              without it, and nothing is locked behind a services purchase.
            </p>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center px-4 pb-4 pt-16 text-center sm:px-10">
        <h2 className="max-w-[22ch] font-extrabold tracking-[-0.03em] text-balance" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
          See it on a real engagement
        </h2>
        <p className="mt-3.5 max-w-[48ch] text-base leading-[1.55] text-[#7C766B]">
          We&rsquo;ll take you through the Hub with a sample client, from the applicability check to a
          reviewed roadmap and its PDFs.
        </p>
        <RequestDemoLink className="mt-[26px] px-[30px] py-[17px] text-base shadow-[0_4px_14px_rgba(120,88,16,0.25)]" />
      </section>
    </MarketingShell>
  );
}
