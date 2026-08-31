import { notFound } from "next/navigation";
import { getAccessibleOrganizations } from "@/lib/actions/ai-systems";
import { getExposureAssessment } from "@/lib/actions/exposure-assessment";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AssessmentClient } from "./assessment-client";

export default async function ExposureAssessmentPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const organizations = await getAccessibleOrganizations();
  const organization = organizations.find((o) => o.id === orgId);
  if (!organization) notFound();

  const existing = await getExposureAssessment(orgId);

  return (
    <>
      <PageHeader
        crumb="Overview"
        title="Regulatory exposure assessment"
        subtitle={`${organization.name} — a short triage read on which EU frameworks likely apply, to kick off the engagement. Not a legal scoping opinion.`}
        actions={
          <Button variant="ghost" href="/overview">
            ← Overview
          </Button>
        }
      />

      <div className="p-8">
        {existing && (
          <p className="mb-5 text-[12.5px] text-muted">
            Last completed {new Date(existing.completedAt).toLocaleDateString()} — retaking it below will overwrite
            that read. Your previous answers are pre-filled.
          </p>
        )}
        <AssessmentClient
          organizationId={organization.id}
          organizationName={organization.name}
          initialAnswers={existing?.answers}
        />
      </div>
    </>
  );
}
