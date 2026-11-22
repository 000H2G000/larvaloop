"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import type { Device, SensorReading, SystemStatus, Thresholds } from "@/types/api";
import { Badge, Card } from "@/components/ui";
import { AlertList } from "./AlertList";
import { LineChart, type Point } from "./LineChart";

const RANGES = [
  { label: "15 min", ms: 15 * 60_000 },
  { label: "1 h", ms: 60 * 60_000 },
  { label: "6 h", ms: 6 * 60 * 60_000 },
] as const;

type Tone = "ok" | "warn" | "danger" | "neutral";

const STATUS: Record<SystemStatus, { tone: Tone; label: string }> = {
  NORMAL: { tone: "ok", label: "Normal" },
  WARNING: { tone: "warn", label: "Warning" },
  CRITICAL: { tone: "danger", label: "Critical" },
  FIRE_ALERT: { tone: "danger", label: "Fire alert" },
  SENSOR_ERROR: { tone: "warn", label: "Sensor error" },
};

const isSimulator = (d: Device) => /simulat/i.test(d.name ?? "") || d.trayCode.startsWith("SIM");

const secondsAgo = (iso: string | null | undefined) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000)) : null);

export function TelemetryDashboard() {
  const latest = usePolling(() => api.getLatestTelemetry(), 3000);
  const alerts = usePolling(() => api.listAlerts({ status: "open", limit: 50 }), 5000);
  const [selected, setSelected] = useState<string | null>(null);
  const [rangeMs, setRangeMs] = useState<number>(RANGES[0].ms);
  const [, forceTick] = useState(0);

  // Real devices first; the simulator is listed last and labelled.
  const items = useMemo(
    () => [...(latest.data?.items ?? [])].sort((a, b) => Number(isSimulator(a.device)) - Number(isSimulator(b.device))),
    [latest.data],
  );

  // ?device=<id> preselects a device (shareable link); otherwise the first real device.
  useEffect(() => {
    if (selected || !items.length) return;
    const linked = new URLSearchParams(window.location.search).get("device");
    setSelected(items.some((i) => i.device.deviceId === linked) ? linked : items[0].device.deviceId);
  }, [items, selected]);

  const select = (deviceId: string) => {
    setSelected(deviceId);
    const url = new URL(window.location.href);
    url.searchParams.set("device", deviceId);
    window.history.replaceState(null, "", url);
  };

  // Re-render every second so "last seen" stays current between polls.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const history = usePolling(
    () => (selected ? api.getTelemetryHistory(selected, new Date(Date.now() - rangeMs)) : Promise.resolve(null)),
    5000,
    [selected, rangeMs],
  );

  const current = items.find((i) => i.device.deviceId === selected);
  const thresholds = latest.data?.thresholds;

  if (latest.error && !latest.data) {
    return (
      <Card>
        <p className="text-sm text-danger" role="alert">{latest.error}</p>
      </Card>
    );
  }
  if (!latest.data) return <p className="text-sm text-muted">Loading…</p>;
  if (!items.length) {
    return (
      <Card title="No devices yet">
        <p className="text-sm">
          Register the ESP32 with <code className="font-mono">npm run device:register -- ESP32_TRAY_01 TRAY_01</code> in the backend,
          then put the printed key in the firmware&apos;s <code className="font-mono">X-Api-Key</code> header.
        </p>
      </Card>
    );
  }

  const deviceAlerts = (alerts.data?.data ?? []).filter((a) => a.deviceId === selected);
  const to = Date.now();
  const from = to - rangeMs;
  const readings = history.data?.readings ?? [];
  const temps: Point[] = readings.map((r) => ({ t: new Date(r.recordedAt).getTime(), v: r.temperature }));
  const hums: Point[] = readings.map((r) => ({ t: new Date(r.recordedAt).getTime(), v: r.humidity }));

  return (
    <div className="space-y-6">
      {/* device switcher + range filter: one row above the charts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Device">
          {items.map(({ device }) => (
            <button
              key={device.deviceId}
              role="tab"
              aria-selected={device.deviceId === selected}
              onClick={() => select(device.deviceId)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                device.deviceId === selected ? "border-accent bg-accent-soft font-medium text-accent" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {device.deviceId}
              {isSimulator(device) && <span className="ml-1.5 text-[10px] uppercase tracking-wide">sim</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeMs(r.ms)}
              aria-pressed={rangeMs === r.ms}
              className={`rounded-md px-2.5 py-1 text-xs ${rangeMs === r.ms ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {current && thresholds && <DeviceBanner device={current.device} offlineAfter={latest.data.offlineAfterSeconds} />}
      {current && thresholds && <LiveTiles reading={current.reading} thresholds={thresholds} />}

      {thresholds && (
        <div className="grid gap-4 xl:grid-cols-2">
          <LineChart
            title="Temperature"
            unit="°C"
            points={temps}
            from={from}
            to={to}
            thresholds={[
              { value: thresholds.temperature.warning, label: `warning ${thresholds.temperature.warning} °C`, tone: "warn" },
              { value: thresholds.temperature.critical, label: `critical ${thresholds.temperature.critical} °C`, tone: "danger" },
            ]}
          />
          <LineChart
            title="Humidity"
            unit="%"
            points={hums}
            from={from}
            to={to}
            thresholds={[
              { value: thresholds.humidity.max, label: `max ${thresholds.humidity.max} %`, tone: "warn" },
              { value: thresholds.humidity.min, label: `min ${thresholds.humidity.min} %`, tone: "warn" },
            ]}
          />
        </div>
      )}

      <Card title={`Open alerts · ${selected}`}>
        <AlertList alerts={deviceAlerts} onChange={alerts.refresh} />
      </Card>

      <p className="text-xs text-muted">
        Updates every 3–5 s{latest.updatedAt && ` · last refresh ${latest.updatedAt.toLocaleTimeString()}`}. Live push (Socket.IO) arrives with backend Phase 4.
      </p>
    </div>
  );
}

function DeviceBanner({ device, offlineAfter }: { device: Device; offlineAfter: number }) {
  const seen = secondsAgo(device.lastSeen);
  const online = device.connectionStatus === "online";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-3 text-sm ${
        online ? "border-border bg-surface" : "border-danger/40 bg-danger-soft"
      }`}
    >
      <Badge tone={online ? "ok" : "danger"}>{online ? "Online" : "Offline"}</Badge>
      <span className="font-medium">{device.name ?? device.deviceId}</span>
      <span className="text-muted">tray {device.trayCode}</span>
      <span className="text-muted">{seen == null ? "never seen" : `last data ${seen}s ago`}</span>
      {isSimulator(device) && <Badge tone="warn">Synthetic test data</Badge>}
      {!online && (
        <span className="text-danger">
          {seen == null
            ? "Waiting for the first reading. Check the firmware's server URL and X-Api-Key."
            : `No data for more than ${offlineAfter}s. Check power and Wi-Fi.`}
        </span>
      )}
    </div>
  );
}

function LiveTiles({ reading, thresholds }: { reading: SensorReading | null; thresholds: Thresholds }) {
  if (!reading) return <p className="text-sm text-muted">This device has not sent any readings yet.</p>;
  const { temperature: T, humidity: H } = thresholds;
  const t = reading.temperature;
  const h = reading.humidity;
  const tTone: Tone = t == null ? "warn" : t >= T.critical ? "danger" : t >= T.warning ? "warn" : "ok";
  const hTone: Tone = h == null ? "warn" : h < H.min || h > H.max ? "warn" : "ok";
  const status = STATUS[reading.systemStatus];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Tile label="Temperature" value={t == null ? "—" : `${t.toFixed(1)} °C`} tone={tTone} note={t == null ? "sensor error" : `warn ${T.warning} · crit ${T.critical}`} />
      <Tile label="Humidity" value={h == null ? "—" : `${h.toFixed(1)} %`} tone={hTone} note={h == null ? "sensor error" : `range ${H.min}–${H.max} %`} />
      <Tile label="Flame sensor" value={reading.flameDetected ? "FLAME" : "Clear"} tone={reading.flameDetected ? "danger" : "ok"} />
      <Tile label="Ventilation" value={reading.servoAngle > 0 ? "Open" : "Closed"} tone="neutral" note={`servo ${reading.servoAngle}°`} />
      <Tile label="Device status" value={status.label} tone={status.tone} note={new Date(reading.recordedAt).toLocaleTimeString()} />
    </div>
  );
}

const TILE_TONE: Record<Tone, string> = {
  ok: "border-border",
  warn: "border-warn/50 bg-warn-soft",
  danger: "border-danger/50 bg-danger-soft",
  neutral: "border-border",
};

const TONE_LABEL: Record<Tone, string | null> = { ok: "OK", warn: "Check", danger: "Alert", neutral: null };

function Tile({ label, value, tone, note }: { label: string; value: string; tone: Tone; note?: string }) {
  return (
    <div className={`rounded-xl border bg-surface p-4 ${TILE_TONE[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        {TONE_LABEL[tone] && <Badge tone={tone}>{TONE_LABEL[tone]}</Badge>}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}
