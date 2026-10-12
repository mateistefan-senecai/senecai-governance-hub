import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { createSystemAction } from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { SystemForm } from "@/components/system-form";

export default async function NewSystemPage({ params }: PageProps<"/clients/[clientId]/systems/new">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const client = await withTenant(ctx, (tx) => requireClient(tx, ctx, clientId));
  return (
    <>
      <PageHeader crumb="Step 1 · AI inventory" title="Add an AI system" subtitle="Record the system first; classification follows right after." />
      <div className="p-8">
        <SystemForm
          action={createSystemAction.bind(null, client.id)}
          submitLabel="Add and classify →"
          cancelHref={`/clients/${client.id}/inventory`}
        />
      </div>
    </>
  );
}
