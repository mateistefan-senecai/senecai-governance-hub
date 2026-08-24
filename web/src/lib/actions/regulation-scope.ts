"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleOrgIds } from "@/lib/authz";
import type { RegulationCode } from "@/generated/prisma/enums";
import { REGULATIONS } from "@/lib/regulations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session;
}

/**
 * Round-2 spec Section 6 — which regulations apply to a client organization.
 * The actual scoping questionnaire (sector, size, etc. -> derived regulation
 * set) still needs to be supplied; this is a direct yes/no per regulation
 * in the meantime. AI_ACT defaults to applicable since it's the only module
 * actually built; everything else defaults to not-applicable until set.
 */
export async function getRegulationScope(organizationId: string): Promise<Record<RegulationCode, boolean>> {
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  const rows = await prisma.organizationRegulationScope.findMany({ where: { organizationId } });
  const byRegulation = new Map(rows.map((r) => [r.regulation, r.applicable]));

  return Object.fromEntries(REGULATIONS.map((r) => [r, byRegulation.get(r) ?? r === "AI_ACT"])) as Record<
    RegulationCode,
    boolean
  >;
}

export async function setRegulationScope(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const session = await requireSession();
  const orgIds = await getAccessibleOrgIds(session);
  if (!orgIds.includes(organizationId)) throw new Error("Not authorized for this organization");

  await Promise.all(
    REGULATIONS.map((regulation) => {
      const applicable = formData.get(`regulation_${regulation}`) === "on";
      return prisma.organizationRegulationScope.upsert({
        where: { organizationId_regulation: { organizationId, regulation } },
        create: { organizationId, regulation, applicable, updatedById: session.user.id },
        update: { applicable, updatedById: session.user.id },
      });
    }),
  );

  revalidatePath("/overview");
  revalidatePath("/settings/regulations");
  redirect(`/settings/regulations?notice=${encodeURIComponent("Regulation scope updated.")}`);
}
