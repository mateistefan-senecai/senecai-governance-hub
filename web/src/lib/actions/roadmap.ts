"use server";

import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { requireClient } from "@/lib/authz";
import { audit } from "@/lib/services/audit";
import { ValidationError } from "@/lib/services/classification";
import type { ActionStatus } from "@/generated/prisma/enums";
import { actor, run, str, strOrNull } from "./run";

export async function updateAction(clientId: string, actionId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/roadmap`, async () => {
    const status = str(form, "status") as ActionStatus;
    if (!["OPEN", "IN_PROGRESS"].includes(status)) {
      throw new ValidationError("An action is closed by assessing its obligation as compliant, not by hand.");
    }
    const due = str(form, "dueDate");
    const dueDate = due ? new Date(due) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) throw new ValidationError("Enter a valid deadline.");
    await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      const action = await tx.action.findFirstOrThrow({ where: { id: actionId, clientId: client.id } });
      if (action.status === "DONE") throw new ValidationError("This action is already closed.");
      const data = { status, ownerName: strOrNull(form, "ownerName"), dueDate };
      await tx.action.update({ where: { id: action.id }, data });
      await audit(tx, actor(ctx), {
        entityType: "Action",
        entityId: action.id,
        action: "action.updated",
        before: { status: action.status, ownerName: action.ownerName, dueDate: action.dueDate },
        after: data,
      });
    });
    return { to: `/clients/${clientId}/roadmap#${actionId}`, notice: "Action saved." };
  });
}

/**
 * Request implementation (spec §10): sends the selected actions and their
 * findings as a scoped enquiry. Nothing in the roadmap depends on it.
 */
export async function requestImplementation(clientId: string, form: FormData) {
  const ctx = await getCtx();
  await run(`/clients/${clientId}/roadmap`, async () => {
    const actionIds = form.getAll("actionIds").filter((v): v is string => typeof v === "string");
    if (!actionIds.length) throw new ValidationError("Select at least one action to ask about.");
    const route = str(form, "route") === "OWN_TEAM" ? "OWN_TEAM" : "SENECAI";
    const contactName = str(form, "contactName");
    const contactEmail = str(form, "contactEmail");
    if (!contactName || !/^\S+@\S+\.\S+$/.test(contactEmail)) throw new ValidationError("Enter a contact name and a valid email.");
    await withTenant(ctx, async (tx) => {
      const client = await requireClient(tx, ctx, clientId);
      const actions = await tx.action.findMany({ where: { id: { in: actionIds }, clientId: client.id, enquiryId: null } });
      if (!actions.length) throw new ValidationError("Those actions already have a request.");
      const enquiry = await tx.enquiry.create({
        data: {
          organizationId: ctx.orgId,
          clientId: client.id,
          route,
          message: strOrNull(form, "message"),
          contactName,
          contactEmail,
          createdById: ctx.userId,
          actions: { connect: actions.map((a) => ({ id: a.id })) },
        },
      });
      await audit(tx, actor(ctx), {
        entityType: "Enquiry",
        entityId: enquiry.id,
        action: "enquiry.created",
        after: { route, actions: actions.map((a) => a.title) },
      });
    });
    return { notice: `Request sent for ${actionIds.length} action${actionIds.length > 1 ? "s" : ""}.` };
  });
}
