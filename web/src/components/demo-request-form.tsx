"use client";

import { useActionState, useState } from "react";
import { submitDemoRequest, type DemoFormState } from "@/lib/actions/demo-requests";

const TYPES = [
  ["LAW_FIRM", "Law firm"],
  ["CONSULTANCY", "Compliance consultancy"],
  ["COMPANY", "Company using or building AI"],
  ["OTHER", "Other"],
] as const;

const LABEL = "block text-[12.5px] font-bold text-[#3F3B34]";
const INPUT =
  "mt-1.5 block w-full rounded-xl border border-[#D8CDB4] bg-white px-3.5 py-2.5 text-[15px] text-[#1C1A17] outline-none focus:border-[#A67C1A] focus:ring-[3px] focus:ring-[#F2E6C8]";

export function DemoRequestForm() {
  const [state, action, pending] = useActionState<DemoFormState, FormData>(submitDemoRequest, { ok: false });
  // Set once on mount: the server rejects forms sent faster than a person can type.
  const [renderedAt] = useState(() => Date.now());
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] p-8 text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[#A67C1A]">REQUEST SENT</p>
        <h2 className="mt-3 text-[24px] font-extrabold tracking-[-0.02em]">Thank you, we&rsquo;ll be in touch</h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-[15px] leading-[1.55] text-[#7C766B]">
          Someone from SenecAI will email you to arrange a time. If it&rsquo;s urgent, write to us through
          senecai.eu.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-[#EBE3D2] bg-[#FFFDF8] p-6 sm:p-8" noValidate={false}>
      <input type="hidden" name="renderedAt" value={renderedAt} />
      {/* Honeypot: hidden from people and screen readers, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>Name</label>
          <input id="name" name="name" required maxLength={120} autoComplete="name" defaultValue={v.name} className={INPUT} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>Work email</label>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={v.email} className={INPUT} />
        </div>
        <div>
          <label htmlFor="organization" className={LABEL}>Organisation</label>
          <input id="organization" name="organization" required maxLength={200} autoComplete="organization" defaultValue={v.organization} className={INPUT} />
        </div>
        <div>
          <label htmlFor="role" className={LABEL}>
            Your role <span className="font-semibold text-[#8A8378]">(optional)</span>
          </label>
          <input id="role" name="role" maxLength={120} autoComplete="organization-title" defaultValue={v.role} className={INPUT} />
        </div>
      </div>

      <fieldset>
        <legend className={LABEL}>Which describes you best?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TYPES.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#D8CDB4] bg-white px-3.5 py-2.5 text-[14.5px] has-[:checked]:border-[#A67C1A] has-[:checked]:bg-[#F7EEDA]"
            >
              <input type="radio" name="requesterType" value={value} required defaultChecked={v.requesterType === value} className="accent-[#A67C1A]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="message" className={LABEL}>
          What would you like to see? <span className="font-semibold text-[#8A8378]">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          defaultValue={v.message}
          placeholder="For example: how many clients or AI systems you work with, or a use case you'd like to walk through."
          className={INPUT}
        />
      </div>

      <label className="flex items-start gap-3 text-[13.5px] leading-[1.5] text-[#5E594F]">
        <input type="checkbox" name="consent" required className="mt-1 accent-[#A67C1A]" />
        <span>
          SenecAI may use these details to contact me about this request. See the{" "}
          <a href="https://www.senecai.eu/privacy-policy" className="font-semibold text-[#A67C1A] underline-offset-2 hover:underline">
            privacy policy
          </a>
          .
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl bg-[#FBEAE5] px-4 py-3 text-[14px] font-semibold text-[#8A2B16]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#A67C1A] px-[30px] py-[15px] text-base font-bold text-white shadow-[0_4px_14px_rgba(120,88,16,0.25)] transition-colors hover:bg-[#8A6512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A67C1A] focus-visible:outline-offset-2 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Request a demo"}
      </button>
    </form>
  );
}
