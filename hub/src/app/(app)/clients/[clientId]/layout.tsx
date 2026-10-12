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
    <div className="flex flex-1">
      <aside className="w-[var(--spacing-sidebar)] shrink-0 border-r border-hairline bg-panel py-5">
        <div className="px-6 pb-5">
          {ctx.role !== "COMPANY_USER" && (
            <Link href="/clients" className="text-[11.5px] text-muted hover:text-gold-hover">
              ← All clients
            </Link>
          )}
          <p className="mt-2 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">Client</p>
          <p className="text-[14.5px] font-semibold leading-snug text-ink">{client.name}</p>
        </div>
        <ClientNav
          items={[
            { href: `${base}/inventory`, label: "AI inventory", hint: "Systems, classification, obligations", disabled: !open },
            { href: `${base}/roadmap`, label: "Compliance roadmap", hint: "Actions from the gap assessment", disabled: !open },
            { href: `${base}/applicability`, label: "Applicability check", hint: client.applicability ? undefined : "Start here" },
            { href: `${base}/audit`, label: "Audit log" },
          ]}
        />
        {!open && (
          <p className="mx-6 mt-5 rounded-lg border border-hairline bg-surface p-3 text-[12px] leading-relaxed text-muted">
            The inventory opens once the applicability check finds that the AI Act applies.
          </p>
        )}
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
