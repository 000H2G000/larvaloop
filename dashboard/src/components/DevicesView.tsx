"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(iso).toLocaleString();
};

/** Real devices from the backend (GET /telemetry/latest), not sample data. */
export function DevicesView() {
  const { data, error } = usePolling(() => api.getLatestTelemetry(), 5000);

  if (error && !data) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {data.items.map(({ device, reading }) => {
          const online = device.connectionStatus === "online";
          const sim = /simulat/i.test(device.name ?? "") || device.trayCode.startsWith("SIM");
          return (
            <article key={device._id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${online ? "bg-ok-soft text-ok" : "bg-background text-muted"}`}>
                    <Icon name="devices" className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{device.deviceId}</h2>
                    <p className="text-xs text-muted">{device.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={online ? "ok" : "danger"}>{online ? "online" : "offline"}</Badge>
                  {sim && <Badge tone="warn">simulator</Badge>}
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Field label="Tray" value={device.trayCode} mono />
                <Field label="Last data" value={ago(device.lastSeen)} />
                <Field label="Temperature" value={reading?.temperature != null ? `${reading.temperature.toFixed(1)} °C` : "—"} />
                <Field label="Humidity" value={reading?.humidity != null ? `${reading.humidity.toFixed(1)} %` : "—"} />
              </dl>

              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span>Firmware {device.firmwareVersion ?? "not reported"}</span>
                <Link href={`/telemetry?device=${device.deviceId}`} className="flex items-center gap-1 font-medium text-accent hover:underline">
                  Telemetry <Icon name="arrow" className="size-3.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <Card title="Add a device">
        <p className="text-sm">Register a board in the backend; the API key is printed once and goes in the firmware&apos;s X-Api-Key header.</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs">npm run device:register -- ESP32_TRAY_02 TRAY_02 &quot;Tray 2&quot;</pre>
        <p className="mt-2 text-xs text-muted">Devices are marked offline after {data.offlineAfterSeconds}s without data.</p>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-medium tabular-nums ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
