import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { aiActApplies } from "@/lib/services/inventory";

export default async function ClientIndex({ params }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const ctx = await getCtx();
  const client = await withTenant(ctx, (tx) => requireClient(tx, ctx, clientId));
  redirect(`/clients/${client.id}/${aiActApplies(client) ? "inventory" : "applicability"}`);
}
