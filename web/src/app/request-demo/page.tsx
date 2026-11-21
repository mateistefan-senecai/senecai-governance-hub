import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { DemoRequestForm } from "@/components/demo-request-form";

export const metadata: Metadata = {
  title: "Request a demo · SenecAI Governance Hub",
  description: "See the Governance Hub on a sample AI Act engagement, from the applicability check to a reviewed roadmap.",
};

const WHAT_YOU_SEE = [
  "The applicability check and a client's AI inventory",
  "Classification with the rules that fired and their articles",
  "Obligations, the gap assessment and the roadmap",
  "The PDFs, and how a reviewer approves and releases them",
];

export default function RequestDemoPage() {
  return (
    <MarketingShell showDemoButton={false}>
      <div className="mx-auto grid max-w-[1100px] gap-10 px-4 pt-10 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-16">
        <div>
          <p className="text-[10.5px] font-bold tracking-[0.2em] text-[#A67C1A]">REQUEST A DEMO</p>
          <h1 className="mt-3 font-extrabold leading-[1.08] tracking-[-0.03em] text-balance" style={{ fontSize: "clamp(30px, 4.4vw, 46px)" }}>
            See the Hub on a sample engagement
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-[#7C766B]">
            Tell us a little about you and we&rsquo;ll arrange a walkthrough, usually about thirty minutes.
          </p>
          <ul className="mt-7 space-y-3">
            {WHAT_YOU_SEE.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-[1.5] text-[#3F3B34]">
                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#A67C1A]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <DemoRequestForm />
      </div>
    </MarketingShell>
  );
}
