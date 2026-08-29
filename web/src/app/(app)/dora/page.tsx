import { PageHeader } from "@/components/ui/page-header";
import { StubScreen } from "@/components/ui/stub-screen";

export default function DoraPage() {
  return (
    <>
      <PageHeader title="DORA" />
      <StubScreen
        title="DORA"
        description="Not built yet. A future module reusing the same decision-tree and obligation-mapping-as-data engine the AI Act module runs on. Which organizations this applies to is set in the regulation-scoping intake from the Overview tab."
      />
    </>
  );
}
