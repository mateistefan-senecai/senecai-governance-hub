import { auth } from "@/lib/auth";
import { NavShell } from "@/components/nav-shell";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userLabel = `${session.user.email} · ${session.user.role.replace("_", " ")}`;

  return <NavShell userLabel={userLabel}>{children}</NavShell>;
}
