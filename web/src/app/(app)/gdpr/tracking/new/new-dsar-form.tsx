"use client";

import { useState } from "react";
import { createDsarRequest } from "@/lib/actions/dsar";
import { Button } from "@/components/ui/button";

const REQUEST_TYPES = [
  { value: "ACCESS", label: "Access" },
  { value: "ERASURE", label: "Erasure" },
  { value: "RECTIFICATION", label: "Rectification" },
  { value: "OBJECTION", label: "Objection" },
  { value: "PORTABILITY", label: "Portability" },
  { value: "RESTRICTION", label: "Restriction" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function NewDsarForm({
  orgs,
  activities,
}: {
  orgs: { id: string; name: string }[];
  activities: { id: string; name: string; organizationId: string }[];
}) {
  const [organizationId, setOrganizationId] = useState(orgs[0]?.id ?? "");
  const showOrgPicker = orgs.length > 1;
  const activitiesForOrg = activities.filter((a) => a.organizationId === organizationId);

  return (
    <form
      action={createDsarRequest}
      className="mx-auto max-w-[720px] overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm"
    >
      <div className="space-y-5 p-6">
        {showOrgPicker ? (
          <div>
            <label htmlFor="organizationId" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Client organization
            </label>
            <select
              id="organizationId"
              name="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="organizationId" value={organizationId} />
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="requestType" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Request type
            </label>
            <select
              id="requestType"
              name="requestType"
              required
              defaultValue=""
              className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
            >
              <option value="" disabled>
                Select a type
              </option>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dateReceived" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
              Date received
            </label>
            <input
              id="dateReceived"
              name="dateReceived"
              type="date"
              required
              defaultValue={todayIso()}
              className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
            />
            <p className="mt-1 text-[11px] text-muted">The Art. 12(3) one-month deadline is computed from this date.</p>
          </div>
        </div>

        <div>
          <label htmlFor="processingActivityId" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
            Linked processing activity (optional)
          </label>
          <select
            id="processingActivityId"
            name="processingActivityId"
            defaultValue=""
            className="mt-1.5 block w-full rounded-lg border border-hairline bg-white px-2.5 py-2 text-[13px] text-ink"
          >
            <option value="">None</option>
            {activitiesForOrg.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="requesterNote" className="block font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
            Note
          </label>
          <textarea
            id="requesterNote"
            name="requesterNote"
            rows={3}
            className="mt-1.5 block w-full rounded-lg border border-hairline px-2.5 py-2 text-[13px] text-ink"
          />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-hairline px-6 py-4">
        <Button type="submit" variant="primary">
          Log request →
        </Button>
      </div>
    </form>
  );
}
