import { redirect } from "next/navigation";

export default async function CompliancePlanRootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/compliance-plan/${id}/obligations`);
}
