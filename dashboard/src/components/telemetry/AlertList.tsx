"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Alert } from "@/types/api";
import { Badge } from "@/components/ui";

const TYPE_LABEL: Record<Alert["alertType"], string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  flame: "Flame",
  sensor_error: "Sensor error",
  device_offline: "Device offline",
};

const SEVERITY = {
  critical: { tone: "danger", icon: "▲", label: "Critical" },
  warning: { tone: "warn", icon: "●", label: "Warning" },
  info: { tone: "neutral", icon: "i", label: "Info" },
} as const;

const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(iso).toLocaleString();
};

export function AlertList({ alerts, onChange, emptyText = "No open alerts." }: { alerts: Alert[]; onChange: () => void; emptyText?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: "ack" | "resolve") => {
    setBusy(id);
    setError(null);
    try {
      await (action === "ack" ? api.acknowledgeAlert(id) : api.resolveAlert(id));
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (!alerts.length) return <p className="text-sm text-muted">{emptyText}</p>;

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
      <ul className="divide-y divide-border">
        {alerts.map((a) => {
          const sev = SEVERITY[a.severity];
          return (
            <li key={a._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.status === "resolved" ? "neutral" : sev.tone}>
                    <span aria-hidden>{sev.icon}</span> {sev.label}
                  </Badge>
                  <span className="text-sm font-medium">{TYPE_LABEL[a.alertType]}</span>
                  <span className="text-xs text-muted">
                    {a.deviceId} · {a.trayCode}
                  </span>
                </div>
                <p className="mt-1 text-sm">{a.message}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Started {ago(a.createdAt)}
                  {a.peakValue != null && ` · peak ${a.peakValue}`}
                  {a.status === "acknowledged" && " · acknowledged"}
                  {a.resolvedAt && ` · resolved ${ago(a.resolvedAt)}${a.resolvedBy === "system" ? " (auto)" : ""}`}
                </p>
              </div>
              {a.status !== "resolved" && (
                <div className="flex gap-2">
                  {a.status === "active" && (
                    <button
                      type="button"
                      disabled={busy === a._id}
                      onClick={() => act(a._id, "ack")}
                      className="rounded-md border border-border px-2.5 py-1 text-xs disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === a._id}
                    onClick={() => act(a._id, "resolve")}
                    className="rounded-md border border-border px-2.5 py-1 text-xs disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
