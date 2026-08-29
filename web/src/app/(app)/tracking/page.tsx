import { PageHeader } from "@/components/ui/page-header";
import { StubScreen } from "@/components/ui/stub-screen";

export default function TrackingPage() {
  return (
    <>
      <PageHeader crumb="AI Act / Step 5" title="Tracking" />
      <StubScreen
        title="Tracking"
        description="Not built yet. Progress updates on compliance-plan actions and the evidence repository come after the Compliance Roadmap exists to update progress against. A consultant will mark status per action point and attach evidence, recalculating the readiness score."
      />
    </>
  );
}
