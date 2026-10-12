"use server";

import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { assertAdmin, requireClient } from "@/lib/authz";
import { getCurrentContent } from "@/lib/content/current";
import { audit } from "@/lib/services/audit";
import { ValidationError } from "@/lib/services/classification";
import { runApplicability } from "@/lib/services/inventory";
import { actor, parseAnswers, run, str } from "./run";

export async function createClient(form: FormData) {
  const ctx = await getCtx();
  await run("/clients", async () => {
    assertAdmin(ctx);
    const name = str(form, "name");
    if (!name) throw new ValidationError("Enter the company's name.");
    const client = await withTenant(ctx, async (tx) => {
      const c = await tx.client.create({ data: { organizationId: ctx.orgId, name } });
      await audit(tx, actor(ctx), { entityType: "Client", entityId: c.id, action: "client.created", after: { name } });
      return c;
    });
    return { to: `/clients/${client.id}/applicability`, notice: `${name} added. Start with the applicability check.` };
  });
}

export async function submitApplicability(clientId: string, form: FormData) {
  const ctx = await getCtx();
  const back = `/clients/${clientId}/applicability`;
  await run(back, async () => {
    const answers = parseAnswers(form);
    await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      await runApplicability(tx, actor(ctx), client, answers, await getCurrentContent(tx));
    });
    return { notice: "Applicability check saved." };
  });
}
