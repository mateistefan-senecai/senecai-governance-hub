import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireSystem } from "@/lib/authz";
import { updateSystemAction } from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { SystemForm } from "@/components/system-form";

export default async function EditSystemPage({ params }: PageProps<"/clients/[clientId]/systems/[systemId]/edit">) {
  const { clientId, systemId } = await params;
  const ctx = await getCtx();
  const { system } = await withTenant(ctx, (tx) => requireSystem(tx, ctx, clientId, systemId));
  return (
    <>
      <PageHeader
        crumb="Step 1 · AI inventory"
        title={`Edit ${system.name}`}
        subtitle="Changing the purpose, origin, supplier, deployment, use, autonomy or affected people reopens the classification."
      />
      <div className="p-8">
        <SystemForm
          action={updateSystemAction.bind(null, clientId, system.id)}
          system={system}
          submitLabel="Save changes"
          cancelHref={`/clients/${clientId}/systems/${system.id}`}
        />
      </div>
    </>
  );
}
