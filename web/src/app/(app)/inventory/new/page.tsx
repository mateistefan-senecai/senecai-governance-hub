import { getAccessibleOrganizations } from "@/lib/actions/ai-systems";
import { PageHeader } from "@/components/ui/page-header";
import { IntakeForm } from "./intake-form";

export default async function NewAiSystemPage() {
  const orgs = await getAccessibleOrganizations();

  if (orgs.length === 0) {
    return (
      <>
        <PageHeader title="New AI system" />
        <div className="p-8">
          <p className="max-w-[60ch] text-[13px] text-body">
            You don&rsquo;t have access to any client organization yet. Ask a SenecAI admin to assign you to one
            before creating an AI system.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumb="Module 1 / Feature 1.1"
        title="New AI system"
        subtitle="Fields mirror the client-facing intake questionnaire. Only the system name is required — everything else can be filled in later."
      />
      <div className="p-8">
        <IntakeForm orgs={orgs} />
      </div>
    </>
  );
}
