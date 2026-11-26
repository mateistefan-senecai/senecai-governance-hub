import Link from "next/link";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { aiActApplies } from "@/lib/services/inventory";
import { ClientNav } from "@/components/client-nav";

export default async function ClientLayout({ children, params }: LayoutProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const client = await withTenant(ctx, (tx) => requireClient(tx, ctx, clientId));
  const base = `/clients/${client.id}`;
  const open = aiActApplies(client);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 bg-rail px-4 pb-6 pt-5 text-rail-text md:w-[var(--spacing-sidebar)]">
        {ctx.role !== "COMPANY_USER" && (
          <Link href="/clients" className="px-2 text-[13px] text-rail-muted hover:text-rail-text">
            ← All clients
          </Link>
        )}
        <div className="rounded-xl border border-rail-line bg-white/5 p-3.5">
          <p className="font-mono text-[10.5px] tracking-micro-wide text-rail-muted">CLIENT</p>
          <p className="mt-1 font-display text-[17px] font-semibold leading-snug">{client.name}</p>
          {client.pilot && <p className="mt-1.5 inline-block rounded-full border border-gold-light/40 px-2 py-0.5 font-mono text-[10px] tracking-micro-wide text-gold-light">PILOT</p>}
        </div>
        <ClientNav
          items={[
            { href: `${base}/overview`, label: "Overview", hint: "Where the company stands", disabled: !client.applicability },
            { href: `${base}/applicability`, label: "Applicability check", hint: client.applicability ? undefined : "Start here" },
            { href: `${base}/inventory`, label: "AI inventory", hint: "Systems, classification, obligations", disabled: !open },
            // Step 4 (evidence) is Stage 2 of the spec: shown so the six steps read in order.
            { href: `${base}/evidence`, label: "Evidence", hint: "Step 4 · Stage 2, coming next", disabled: true },
            { href: `${base}/gap-assessment`, label: "Gap assessment", hint: "Status of every obligation", disabled: !open },
            { href: `${base}/roadmap`, label: "Compliance roadmap", hint: "Actions from the gap assessment", disabled: !open },
            { href: `${base}/documents`, label: "Documents", hint: "PDF deliverables and their review", disabled: !open },
            { href: `${base}/team`, label: "Team", hint: "People and invitations" },
            { href: `${base}/audit`, label: "Audit log" },
          ]}
        />
        {!open && (
          <p className="mt-auto rounded-xl border border-dashed border-white/15 p-3 text-[12px] leading-relaxed text-rail-muted">
            The inventory opens once the applicability check finds that the AI Act applies.
          </p>
        )}
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
