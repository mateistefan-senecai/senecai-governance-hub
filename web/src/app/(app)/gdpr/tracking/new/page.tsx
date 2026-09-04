import { getAccessibleOrganizations } from "@/lib/actions/ai-systems";
import { listProcessingActivities } from "@/lib/actions/processing-activities";
import { PageHeader } from "@/components/ui/page-header";
import { NewDsarForm } from "./new-dsar-form";

export default async function NewDsarRequestPage() {
  const [orgs, activities] = await Promise.all([getAccessibleOrganizations(), listProcessingActivities()]);

  if (orgs.length === 0) {
    return (
      <>
        <PageHeader title="Log DSAR request" />
        <div className="p-8">
          <p className="max-w-[60ch] text-[13px] text-body">
            You don&rsquo;t have access to any client organization yet. Ask a SenecAI admin to assign you to one
            before logging a DSAR request.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumb="GDPR / Step 5"
        title="Log DSAR request"
        subtitle="The statutory (Art. 12(3)) one-month deadline is computed automatically from the date received."
      />
      <div className="p-8">
        <NewDsarForm
          orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
          activities={activities.map((a) => ({ id: a.id, name: a.name, organizationId: a.organizationId }))}
        />
      </div>
    </>
  );
}
