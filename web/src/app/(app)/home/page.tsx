import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";

/**
 * Where a user lands after signing in (spec §3): a company user goes straight
 * to their own inventory; consultants, lawyers and admins see their clients.
 */
export default async function HomePage() {
  const ctx = await getCtx();
  if (ctx.role === "COMPANY_USER" && ctx.clientId) redirect(`/clients/${ctx.clientId}/inventory`);
  redirect("/clients");
}
