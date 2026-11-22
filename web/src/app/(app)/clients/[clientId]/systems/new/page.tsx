import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { createSystemAction } from "@/lib/actions/systems";
import { PageHeader } from "@/components/ui/page-header";
import { SystemForm } from "@/components/system-form";
import { getCurrentContent } from "@/lib/content/current";
import { suggestedAreas, systemFormFacts } from "@/lib/content/facts";
import type { Answers } from "@/lib/content/types";

export default async function NewSystemPage({ params }: PageProps<"/clients/[clientId]/systems/new">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const { client, content } = await withTenant(ctx, async (tx) => ({
    client: await requireClient(tx, ctx, clientId),
    content: await getCurrentContent(tx),
  }));
  return (
    <>
      <PageHeader crumb="Step 1 · AI inventory" title="Add an AI system" subtitle="Record the system first; classification follows right after." />
      <div className="p-8">
        <SystemForm
          action={createSystemAction.bind(null, client.id)}
          submitLabel="Add and classify →"
          cancelHref={`/clients/${client.id}/inventory`}
          facts={systemFormFacts(content.classification)}
          suggestedAreas={suggestedAreas(content.applicability, client.profile as Answers | null)}
        />
      </div>
    </>
  );
}
