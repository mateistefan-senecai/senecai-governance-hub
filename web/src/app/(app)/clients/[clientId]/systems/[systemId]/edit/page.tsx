import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireSystem } from "@/lib/authz";
import { updateSystemAction } from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { SystemForm } from "@/components/system-form";
import { getCurrentContent } from "@/lib/content/current";
import { systemFormFacts } from "@/lib/content/facts";

export default async function EditSystemPage({ params }: PageProps<"/clients/[clientId]/systems/[systemId]/edit">) {
  const { clientId, systemId } = await params;
  const ctx = await getCtx();
  const { system, content } = await withTenant(ctx, async (tx) => ({
    ...(await requireSystem(tx, ctx, clientId, systemId)),
    content: await getCurrentContent(tx),
  }));
  return (
    <>
      <PageHeader
        crumb="Step 1 · AI inventory"
        title={`Edit ${system.name}`}
        subtitle="Changing the purpose, origin, supplier, deployment, use, stage, autonomy, areas, affected people or what the system does reopens the classification."
      />
      <div className="p-8">
        <SystemForm
          action={updateSystemAction.bind(null, clientId, system.id)}
          system={system}
          submitLabel="Save changes"
          cancelHref={`/clients/${clientId}/systems/${system.id}`}
          facts={systemFormFacts(content.classification)}
        />
      </div>
    </>
  );
}
