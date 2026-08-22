import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * No physical/logical per-client data isolation at this stage (concept
 * note decision) — everyone shares one database. This is the one place
 * that decides which organizationIds a session may read/write, so that
 * decision stays centralized instead of re-implemented per query.
 */
export async function getAccessibleOrgIds(session: Session): Promise<string[]> {
  const { role, organizationId } = session.user;

  if (role === UserRole.SENECAI_ADMIN) {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    return orgs.map((o) => o.id);
  }

  if (role === UserRole.CONSULTANT) {
    const assignments = await prisma.consultantAssignment.findMany({
      where: { consultantId: session.user.id },
      select: { clientOrganizationId: true },
    });
    return assignments.map((a) => a.clientOrganizationId);
  }

  // CLIENT_ADMIN / CLIENT_MEMBER: only their own organization.
  return [organizationId];
}

export async function canAccessOrg(session: Session, organizationId: string): Promise<boolean> {
  const ids = await getAccessibleOrgIds(session);
  return ids.includes(organizationId);
}

export function isConsultantOrAbove(session: Session): boolean {
  return session.user.role === UserRole.SENECAI_ADMIN || session.user.role === UserRole.CONSULTANT;
}
