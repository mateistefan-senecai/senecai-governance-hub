import Link from "next/link";
import { viewInvitation } from "@/lib/services/invitations";
import { AcceptForm } from "./accept-form";

const ROLE_TEXT = {
  ORG_ADMIN: "as an admin",
  REVIEWER: "as a reviewer",
  COMPANY_USER: "to work on your company's AI Act compliance",
} as const;

const PROBLEM_TEXT = {
  expired: "This invitation link has expired.",
  used: "This invitation has already been accepted.",
  revoked: "This invitation link is no longer valid: it was withdrawn or replaced by a newer one.",
} as const;

/** Public: the page an invitation link opens. */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const inv = await viewInvitation(token);

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-hover">SenecAI · EU AI Act</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Governance Hub</h1>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        {!inv ? (
          <Problem text="This invitation link is not valid. Check that you copied all of it, or ask for a new one." />
        ) : inv.problem ? (
          <Problem text={`${PROBLEM_TEXT[inv.problem]} ${inv.problem === "used" ? "" : `Ask ${inv.invitedByName} for a new one.`}`} signIn={inv.problem === "used"} />
        ) : (
          <>
            <p className="text-[14px] leading-relaxed text-ink">
              {inv.invitedByName} invited you to <strong>{inv.clientName ?? inv.organizationName}</strong> {ROLE_TEXT[inv.role]}
              {inv.clientName ? ` (via ${inv.organizationName})` : ""}.
            </p>
            <p className="mt-2 text-[13px] text-muted">
              {inv.hasAccount ? (
                <>You already have an account for <strong className="text-ink">{inv.email}</strong>. Confirm with its password.</>
              ) : (
                <>Your account will be <strong className="text-ink">{inv.email}</strong>. Choose a password to finish.</>
              )}
            </p>
            <AcceptForm token={token} hasAccount={inv.hasAccount} defaultName={inv.name} />
          </>
        )}
      </div>
    </div>
  );
}

function Problem({ text, signIn }: { text: string; signIn?: boolean }) {
  return (
    <div className="space-y-4 text-[14px] text-ink">
      <p>{text}</p>
      {signIn && (
        <Link href="/login" className="inline-block rounded-lg bg-gold px-4 py-2 text-[13px] font-semibold text-white hover:bg-gold-hover">
          Sign in
        </Link>
      )}
    </div>
  );
}
