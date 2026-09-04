import { getAccessibleOrganizations } from "@/lib/actions/ai-systems";
import { PageHeader } from "@/components/ui/page-header";
import { IntakeForm } from "./intake-form";

export default async function NewProcessingActivityPage() {
  const orgs = await getAccessibleOrganizations();

  if (orgs.length === 0) {
    return (
      <>
        <PageHeader title="New processing activity" />
        <div className="p-8">
          <p className="max-w-[60ch] text-[13px] text-body">
            You don&rsquo;t have access to any client organization yet. Ask a SenecAI admin to assign you to one
            before adding a processing activity.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumb="GDPR / Step 1"
        title="New processing activity"
        subtitle="Fields follow the Art. 30 ROPA record. Only the name is required — everything else, including role and characteristics, can be filled in later."
      />
      <div className="p-8">
        <IntakeForm orgs={orgs} />
      </div>
    </>
  );
}
