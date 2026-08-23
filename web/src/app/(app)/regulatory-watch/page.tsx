import { PageHeader } from "@/components/ui/page-header";
import { StubScreen } from "@/components/ui/stub-screen";

export default function RegulatoryWatchPage() {
  return (
    <>
      <PageHeader crumb="Module 4" title="Regulatory Watch" />
      <StubScreen
        title="Module 4 — Regulatory Watch"
        description="Not built yet. Per the concept note this is the simplest module to build — a notification feed over curated regulatory updates, alerting clients when a change touches obligations already mapped to their systems."
      />
    </>
  );
}
