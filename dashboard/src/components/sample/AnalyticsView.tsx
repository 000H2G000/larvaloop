"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SAMPLE_OBSERVATIONS, SAMPLE_TRAYS, trayStats } from "@/lib/sampleData";
import type { SensorReading, Thresholds } from "@/types/api";
import { MultiLineChart, type Series } from "@/components/charts/MultiLineChart";
import { Badge, Card, SampleDataBanner, StatCard } from "@/components/ui";

const series = (value: (o: (typeof SAMPLE_OBSERVATIONS)[number]) => number): Series[] =>
  SAMPLE_TRAYS.map((t) => ({
    key: t.trayCode,
    label: t.name.split(" · ")[1] ?? t.name,
    color: t.color,
    points: SAMPLE_OBSERVATIONS.filter((o) => o.trayCode === t.trayCode)
      .sort((a, b) => a.week - b.week)
      .map((o) => ({ x: o.week, y: value(o) })),
  }));

export function AnalyticsView() {
  return (
    <div className="space-y-8">
      <LiveEnvironment />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Feeding trial</h2>
          <Badge tone="warn">sample data</Badge>
        </div>
        <SampleDataBanner phase={7} what="growth and feed-conversion analytics" />

        <div className="grid gap-3 md:grid-cols-3">
          {SAMPLE_TRAYS.map((t) => {
            const s = trayStats(t.trayCode);
            return (
              <div key={t.trayCode} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />
                  {t.name}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="FCR" value={s.fcr == null ? "—" : s.fcr.toFixed(2)} hint="feed ÷ gain" />
                  <Metric label="Gain" value={`${s.biomassGain} g`} />
                  <Metric label="Survival" value={`${(s.survival * 100).toFixed(1)}%`} />
                </dl>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MultiLineChart title="Biomass per tray" unit="g" series={series((o) => o.estimatedBiomassGrams)} xLabel={(w) => `W${w}`} />
          <MultiLineChart
            title="Survival per tray"
            unit="%"
            decimals={1}
            zeroBaseline={false}
            series={series((o) => (o.larvaeCount / (o.larvaeCount + o.mortalityCount)) * 100)}
            xLabel={(w) => `W${w}`}
          />
        </div>
        <p className="text-xs text-muted">
          FCR (feed conversion ratio) = feed given ÷ biomass gained; lower is better. With real data it is shown only when both feed intake and
          biomass measurements exist.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-background px-2 py-2">
      <dt className="text-[11px] text-muted" title={hint}>
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

type Env = { readings: SensorReading[]; thresholds: Thresholds; deviceId: string } | null;

/** Real 24 h environment summary for the live tray (not sample data). */
function LiveEnvironment() {
  const [env, setEnv] = useState<Env | "empty" | "error" | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const latest = await api.getLatestTelemetry();
        const real = latest.items.find((i) => !/simulat/i.test(i.device.name ?? "") && !i.device.trayCode.startsWith("SIM"));
        if (!real) return setEnv("empty");
        const h = await api.getTelemetryHistory(real.device.deviceId, new Date(Date.now() - 24 * 3600_000));
        setEnv(h.readings.length ? { readings: h.readings, thresholds: latest.thresholds, deviceId: real.device.deviceId } : "empty");
      } catch {
        setEnv("error");
      }
    })();
  }, []);

  const stats = (vals: number[]) =>
    vals.length ? { min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length } : null;

  let body;
  if (env === undefined) body = <p className="text-sm text-muted">Loading…</p>;
  else if (env === "error") body = <p className="text-sm text-danger">Could not reach the backend.</p>;
  else if (env === "empty" || env === null)
    body = <p className="text-sm text-muted">No readings from the tray ESP32 in the last 24 hours. Values appear here as soon as it sends data.</p>;
  else {
    const temps = env.readings.map((r) => r.temperature).filter((v): v is number => v != null);
    const hums = env.readings.map((r) => r.humidity).filter((v): v is number => v != null);
    const t = stats(temps);
    const h = stats(hums);
    const T = env.thresholds.temperature;
    const H = env.thresholds.humidity;
    const inRange = env.readings.filter((r) => r.temperature != null && r.humidity != null && r.temperature < T.warning && r.humidity >= H.min && r.humidity <= H.max).length;
    body = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Temperature (mean)" value={t ? `${t.mean.toFixed(1)} °C` : "—"} note={t ? `min ${t.min.toFixed(1)} · max ${t.max.toFixed(1)}` : "no valid readings"} />
        <StatCard label="Humidity (mean)" value={h ? `${h.mean.toFixed(1)} %` : "—"} note={h ? `min ${h.min.toFixed(1)} · max ${h.max.toFixed(1)}` : "no valid readings"} />
        <StatCard label="Time in safe range" value={`${Math.round((inRange / env.readings.length) * 100)} %`} note={`< ${T.warning} °C and ${H.min}–${H.max} %`} />
        <StatCard label="Readings" value={env.readings.length} note={`${env.deviceId} · last 24 h`} />
      </div>
    );
  }

  return (
    <Card title={<span className="flex items-center gap-2">Tray environment · last 24 h <Badge tone="ok">live data</Badge></span>}>{body}</Card>
  );
}
