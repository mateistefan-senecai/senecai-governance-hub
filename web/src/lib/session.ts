import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { withUser } from "@/lib/tenant";
import type { MemberRole, OrganizationType } from "@/generated/prisma/enums";

export const ACTIVE_ORG_COOKIE = "hub_org";

export type MembershipSummary = {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  role: MemberRole;
};

/** Who is acting, in which organisation, with which role. */
export type Ctx = {
  userId: string;
  userName: string;
  email: string;
  orgId: string;
  orgName: string;
  orgType: OrganizationType;
  role: MemberRole;
  membershipId: string;
  /** Set for COMPANY_USER: the one client they belong to. */
  clientId: string | null;
  memberships: MembershipSummary[];
};

/**
 * Resolves the request's context once per request. Redirects to /login when
 * signed out. The active organisation comes from a cookie and is always
 * re-checked against the user's memberships, so a stale or forged cookie
 * falls back to a membership the user actually holds.
 */
export const getCtx = cache(async (): Promise<Ctx> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const memberships = await withUser(userId, (tx) =>
    tx.membership.findMany({
      where: { userId },
      include: { organization: true, user: true },
      orderBy: { createdAt: "asc" },
    }),
  );
  if (!memberships.length) redirect("/login?error=no-membership");

  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organizationId === wanted) ?? memberships[0];

  return {
    userId,
    userName: active.user.name,
    email: active.user.email,
    orgId: active.organizationId,
    orgName: active.organization.name,
    orgType: active.organization.type,
    role: active.role,
    membershipId: active.id,
    clientId: active.clientId,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationType: m.organization.type,
      role: m.role,
    })),
  };
});
