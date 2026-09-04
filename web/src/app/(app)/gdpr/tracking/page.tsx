import { listDsarRequests, updateDsarStatus } from "@/lib/actions/dsar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusSegmentedForm } from "@/components/ui/status-segmented-form";
import { Tag } from "@/components/ui/tag";

const DSAR_STATUS_OPTIONS = [
  { value: "RECEIVED", label: "Received" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESS: "Access",
  ERASURE: "Erasure",
  RECTIFICATION: "Rectification",
  OBJECTION: "Objection",
  PORTABILITY: "Portability",
  RESTRICTION: "Restriction",
};

export default async function GdprTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const requests = await listDsarRequests();

  const now = new Date();
  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === "RECEIVED" || r.status === "IN_PROGRESS").length,
    overdue: requests.filter(
      (r) => (r.status === "RECEIVED" || r.status === "IN_PROGRESS") && r.statutoryDeadline < now,
    ).length,
    completed: requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="GDPR / Step 5"
        title="Tracking & DSAR Log"
        subtitle="A static log of data subject access requests and their statutory (Art. 12(3)) one-month deadline."
        actions={
          <Button variant="primary" href="/gdpr/tracking/new">
            + Log DSAR request
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-8 py-4">
        <p className="max-w-[60ch] text-[12px] text-muted">
          No reminders or notifications yet — deadlines are shown for reference; check back here to stay on top of
          them.
        </p>
        <div className="flex items-center gap-8">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Open" value={stats.open} />
          <StatTile label="Overdue" value={stats.overdue} />
          <StatTile label="Completed" value={stats.completed} />
        </div>
      </div>

      <div className="p-8">
        {requests.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No DSAR requests logged yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="bg-ink">
                <tr>
                  {[
                    "Type",
                    "Organization",
                    "Linked activity",
                    "Received",
                    "Statutory deadline",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2.5 font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-panel"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {requests.map((r) => {
                  const overdue =
                    (r.status === "RECEIVED" || r.status === "IN_PROGRESS") && r.statutoryDeadline < now;
                  return (
                    <tr key={r.id} className="hover:bg-row-hover">
                      <td className="px-3.5 py-3">
                        <p className="text-[13px] font-medium text-ink">{REQUEST_TYPE_LABEL[r.requestType]}</p>
                        {r.requesterNote && <p className="mt-0.5 max-w-[36ch] text-[11.5px] text-muted">{r.requesterNote}</p>}
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-body">{r.organization.name}</td>
                      <td className="px-3.5 py-3 text-[13px] text-body">{r.processingActivity?.name ?? "—"}</td>
                      <td className="px-3.5 py-3 text-[13px] tabular-nums text-body">
                        {r.dateReceived.toLocaleDateString()}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] tabular-nums text-body">
                            {r.statutoryDeadline.toLocaleDateString()}
                          </span>
                          {overdue && <Tag tone="gold-fill">Overdue</Tag>}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <StatusSegmentedForm
                          action={updateDsarStatus}
                          hiddenFields={{ id: r.id }}
                          activeValue={r.status}
                          options={DSAR_STATUS_OPTIONS}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
