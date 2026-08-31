import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isConsultantOrAbove } from "@/lib/authz";
import { UserRole } from "@/generated/prisma/enums";
import { NavShell } from "@/components/nav-shell";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  return (
    <NavShell
      orgName={organization?.name ?? "—"}
      email={session.user.email ?? "—"}
      roleLabel={session.user.role.replace(/_/g, " ")}
      canReview={isConsultantOrAbove(session)}
      isSenecaiAdmin={session.user.role === UserRole.SENECAI_ADMIN}
    >
      {children}
    </NavShell>
  );
}
