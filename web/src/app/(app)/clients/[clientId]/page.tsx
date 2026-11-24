import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";

export default async function ClientIndex({ params }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const client = await withTenant(ctx, (tx) => requireClient(tx, ctx, clientId));
  // The overview is the starting screen once the applicability check has been run.
  redirect(`/clients/${client.id}/${client.applicability ? "overview" : "applicability"}`);
}
