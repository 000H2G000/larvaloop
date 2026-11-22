"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { Card } from "@/components/ui";
import { AlertList } from "./AlertList";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
] as const;

export function AlertsBoard() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]["value"]>("open");
  const [page, setPage] = useState(1);
  const { data, error, refresh } = usePolling(() => api.listAlerts({ status, page, limit: 20 }), 5000, [status, page]);
  const meta = data?.meta;

  return (
    <Card
      action={
        <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Alert status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              aria-pressed={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs ${status === f.value ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
      title={meta ? `${meta.total} alert${meta.total === 1 ? "" : "s"}` : "Alerts"}
    >
      {error && !data && <p className="text-sm text-danger">{error}</p>}
      {data && <AlertList alerts={data.data} onChange={refresh} emptyText={status === "open" ? "No open alerts. All conditions normal." : "No alerts."} />}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            {page} / {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </Card>
  );
}
