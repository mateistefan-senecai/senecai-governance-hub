"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { ACTIVE_ORG_COOKIE, getCtx } from "@/lib/session";

export async function switchOrganization(form: FormData) {
  const ctx = await getCtx();
  const orgId = form.get("orgId");
  // Only organisations the user is a member of; anything else is ignored.
  if (typeof orgId === "string" && ctx.memberships.some((m) => m.organizationId === orgId)) {
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  redirect("/home");
}

export async function signOutAction() {
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  await signOut({ redirectTo: "/login" });
}
