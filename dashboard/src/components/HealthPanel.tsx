"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, isNetworkError } from "@/lib/api";
import { config } from "@/lib/config";
import type { HealthStatus } from "@/types/api";
import { Badge, Card } from "@/components/ui";

type State =
  | { kind: "loading" }
  | { kind: "ready"; health: HealthStatus; checkedAt: Date }
  | { kind: "error"; message: string; unreachable: boolean; checkedAt: Date };

const formatUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
};

export function HealthPanel() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const check = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setState({ kind: "ready", health, checkedAt: new Date() });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Unknown error",
        unreachable: isNetworkError(err),
        checkedAt: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, config.healthPollMs);
    return () => clearInterval(id);
  }, [check]);

  const refresh = (
    <button
      type="button"
      onClick={check}
      className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
    >
      Refresh
    </button>
  );

  if (state.kind === "loading") {
    return (
      <Card title="Backend status" action={refresh}>
        <p className="text-sm text-muted">Checking…</p>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card title="Backend status" action={refresh}>
        <Badge tone="danger">{state.unreachable ? "Unreachable" : "Error"}</Badge>
        <p className="mt-3 text-sm">{state.message}</p>
        {state.unreachable && (
          <p className="mt-2 text-sm text-muted">
            Start it with <code className="font-mono">npm run dev</code> in <code className="font-mono">backend/</code>,
            and check that <code className="font-mono">CORS_ORIGIN</code> includes this page&apos;s origin.
          </p>
        )}
        <p className="mt-3 text-xs text-muted">Last checked {state.checkedAt.toLocaleTimeString()}</p>
      </Card>
    );
  }

  const { health, checkedAt } = state;
  const dbOk = health.dependencies.mongodb === "connected";

  return (
    <Card title="Backend status" action={refresh}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="API">
          <Badge tone={health.status === "ok" ? "ok" : "warn"}>{health.status === "ok" ? "Healthy" : "Degraded"}</Badge>
        </Stat>
        <Stat label="MongoDB">
          <Badge tone={dbOk ? "ok" : "danger"}>{health.dependencies.mongodb}</Badge>
        </Stat>
        <Stat label="Vision service">
          {health.dependencies.vision ? (
            <Badge tone={health.dependencies.vision === "up" ? "ok" : "danger"}>{health.dependencies.vision}</Badge>
          ) : (
            <span className="text-sm text-muted">n/a</span>
          )}
        </Stat>
        <Stat label="Environment">
          <span className="text-sm font-medium">{health.environment}</span>
        </Stat>
        <Stat label="Uptime">
          <span className="font-mono text-sm font-medium tabular-nums">{formatUptime(health.uptimeSeconds)}</span>
        </Stat>
      </dl>
      <p className="mt-4 text-xs text-muted">
        {health.service} · last checked {checkedAt.toLocaleTimeString()} · refreshes every {config.healthPollMs / 1000}s
      </p>
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1.5 text-xs text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
