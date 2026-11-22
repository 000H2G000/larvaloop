"use client";
/* eslint-disable @next/next/no-img-element -- images come from the backend API */

import Link from "next/link";
import { api, imageUrls } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { GROUPS, MODULES } from "@/lib/modules";
import { usePolling } from "@/lib/usePolling";
import { Badge, Card, StatCard } from "@/components/ui";
import { HealthPanel } from "@/components/HealthPanel";
import { Icon, LogoMark } from "@/components/icons";

const isSim = (name?: string, tray?: string) => /simulat/i.test(name ?? "") || (tray ?? "").startsWith("SIM");

export function OverviewDashboard() {
  const latest = usePolling(() => api.getLatestTelemetry(), 5000);
  const alerts = usePolling(() => api.listAlerts({ status: "open", limit: 3 }), 8000);
  const images = usePolling(() => api.listImages(1), 15000);

  const items = latest.data?.items ?? [];
  const real = items.find((i) => !isSim(i.device.name, i.device.trayCode)) ?? items[0];
  const reading = real?.reading;
  const T = latest.data?.thresholds.temperature;
  const online = items.filter((i) => i.device.connectionStatus === "online").length;
  const openCount = alerts.data?.meta?.total ?? 0;
  const lastImage = images.data?.data[0];

  const tTone = reading?.temperature == null || !T ? undefined : reading.temperature >= T.critical ? "danger" : reading.temperature >= T.warning ? "warn" : undefined;

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-8">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <LogoMark className="size-12" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{BRAND.name}</h1>
            <p className="text-sm text-muted">
              {BRAND.tagline} · {BRAND.project}
            </p>
          </div>
        </div>
        <p className="relative mt-4 max-w-2xl text-sm">{BRAND.description}</p>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Link href="/telemetry" className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-surface">
            Live tray <Icon name="arrow" className="size-3.5" />
          </Link>
          <Link href="/images" className="rounded-lg border border-border px-3.5 py-2 text-sm">
            Measure larvae
          </Link>
        </div>
      </section>

      {/* live KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Temperature · ${real?.device.trayCode ?? "tray"}`}
          value={reading?.temperature != null ? `${reading.temperature.toFixed(1)} °C` : "—"}
          note={reading ? new Date(reading.recordedAt).toLocaleTimeString() : "no readings yet"}
          tone={tTone}
          icon={<Icon name="telemetry" />}
        />
        <StatCard
          label="Humidity"
          value={reading?.humidity != null ? `${reading.humidity.toFixed(1)} %` : "—"}
          note={reading ? `vent ${reading.servoAngle > 0 ? "open" : "closed"}` : "—"}
          icon={<Icon name="telemetry" />}
        />
        <StatCard
          label="Open alerts"
          value={openCount}
          note={openCount ? "needs attention" : "all clear"}
          tone={openCount ? "warn" : undefined}
          icon={<Icon name="alerts" />}
        />
        <StatCard label="Devices online" value={`${online} / ${items.length}`} note="ESP32 boards" icon={<Icon name="devices" />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Latest vision analysis" action={<Link href="/images" className="text-xs font-medium text-accent hover:underline">Open Vision</Link>}>
          {lastImage?.latestAnalysis?.status === "completed" ? (
            <Link href={`/images?image=${lastImage._id}`} className="flex gap-4">
              <img
                src={imageUrls.annotated(lastImage._id, lastImage.latestAnalysis._id)}
                alt="Latest analysed image"
                className="size-28 shrink-0 rounded-xl border border-border bg-background object-cover"
              />
              <div className="min-w-0">
                <p className="text-3xl font-semibold tabular-nums">{lastImage.latestAnalysis.larvaeCount}</p>
                <p className="text-sm text-muted">larvae detected</p>
                <p className="mt-2 text-sm">
                  Median length {lastImage.latestAnalysis.lengthMm.median != null ? `${lastImage.latestAnalysis.lengthMm.median.toFixed(1)} mm` : "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lastImage.source === "sample_dataset" && <Badge tone="warn">sample sheet</Badge>}
                  <Badge>{new Date(lastImage.capturedAt).toLocaleString()}</Badge>
                </div>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted">No analysed images yet. Capture one from the Vision page.</p>
          )}
        </Card>

        <Card title="Open alerts" action={<Link href="/alerts" className="text-xs font-medium text-accent hover:underline">All alerts</Link>}>
          {alerts.data?.data.length ? (
            <ul className="space-y-2">
              {alerts.data.data.map((a) => (
                <li key={a._id} className="flex items-start justify-between gap-3 rounded-xl bg-background px-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{a.message}</span>
                    <span className="block text-xs text-muted">
                      {a.deviceId} · {new Date(a.createdAt).toLocaleTimeString()}
                    </span>
                  </span>
                  <Badge tone={a.severity === "critical" ? "danger" : "warn"}>{a.severity}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open alerts. All conditions normal.</p>
          )}
        </Card>
      </div>

      <HealthPanel />

      {GROUPS.map((group) => (
        <section key={group}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.filter((m) => m.group === group).map((m) => (
              <Link key={m.slug} href={`/${m.slug}`} className="group rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon name={m.icon} />
                  </span>
                  {m.mode === "live" ? <Badge tone="ok">live</Badge> : <Badge tone="warn">sample</Badge>}
                </div>
                <h3 className="mt-3 text-sm font-semibold">{m.label}</h3>
                <p className="mt-1 text-xs text-muted">{m.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
