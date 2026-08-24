import { PageHeader } from "@/components/ui/page-header";
import { StubScreen } from "@/components/ui/stub-screen";

export default function ResearchPage() {
  return (
    <>
      <PageHeader crumb="AI Act" title="Research" />
      <StubScreen
        title="Research"
        description="Not built yet. A workspace for the consultant-facing research that backs a client's obligations and classifications — source material, precedent, and open questions — kept alongside the AI Act module rather than as a separate regulation."
      />
    </>
  );
}
