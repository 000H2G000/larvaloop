"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface Point {
  t: number; // epoch ms
  v: number | null; // null = no reading (sensor error)
}

interface Threshold {
  value: number;
  label: string;
  tone: "warn" | "danger";
}

interface Props {
  title: string;
  unit: string;
  points: Point[];
  from: number;
  to: number;
  thresholds?: Threshold[];
  /** Readings further apart than this are drawn as a gap (device offline). */
  maxGapMs?: number;
  decimals?: number;
}

const HEIGHT = 180;
const M = { top: 10, right: 12, bottom: 22, left: 40 };

const niceTicks = (min: number, max: number, count = 4) => {
  const span = max - min || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
};

const timeLabel = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Single-series time chart (one measure per chart; never a second y-axis). */
export function LineChart({ title, unit, points, from, to, thresholds = [], maxGapMs = 30_000, decimals = 1 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<Point | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;

  const { yMin, yMax, segments, yTicks, xTicks } = useMemo(() => {
    const values = points.map((p) => p.v).filter((v): v is number => v != null);
    const all = [...values, ...thresholds.map((t) => t.value)];
    let lo = all.length ? Math.min(...all) : 0;
    let hi = all.length ? Math.max(...all) : 1;
    const pad = Math.max((hi - lo) * 0.12, 0.5);
    lo -= pad;
    hi += pad;

    // Split into drawable runs at null readings and at long gaps.
    const segs: Point[][] = [];
    let cur: Point[] = [];
    let prev: Point | null = null;
    for (const p of points) {
      const gap = prev && p.t - prev.t > maxGapMs;
      if (p.v == null || gap) {
        if (cur.length) segs.push(cur);
        cur = [];
      }
      if (p.v != null) cur.push(p);
      prev = p;
    }
    if (cur.length) segs.push(cur);

    const span = to - from;
    const xt = [0, 1, 2, 3, 4].map((i) => from + (span * i) / 4);
    return { yMin: lo, yMax: hi, segments: segs, yTicks: niceTicks(lo, hi), xTicks: xt };
  }, [points, thresholds, from, to, maxGapMs]);

  const x = (t: number) => M.left + ((t - from) / (to - from || 1)) * plotW;
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = from + ((e.clientX - rect.left) / rect.width) * (to - from);
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid].t < t) lo = mid;
      else hi = mid;
    }
    setHover(Math.abs(points[lo].t - t) < Math.abs(points[hi].t - t) ? points[lo] : points[hi]);
  };

  const latest = [...points].reverse().find((p) => p.v != null);

  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">
          {points.length ? `${points.length} readings` : "No readings in this range"}
          {latest?.v != null && ` · latest ${latest.v.toFixed(decimals)} ${unit}`}
        </span>
      </figcaption>

      <div ref={wrapRef} className="relative">
        <svg width={width} height={HEIGHT} role="img" aria-label={`${title} over time`} className="block">
          {/* recessive grid + axes */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={M.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--muted)] text-[10px] tabular-nums">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-[var(--muted)] text-[10px] tabular-nums"
            >
              {timeLabel(t)}
            </text>
          ))}

          {/* thresholds: dashed status lines, labelled in muted ink */}
          {thresholds.map((th) => (
            <g key={th.label}>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={y(th.value)}
                y2={y(th.value)}
                stroke={th.tone === "danger" ? "var(--danger)" : "var(--warn)"}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {/* left-aligned: the newest data is drawn on the right */}
              <text x={M.left + 4} y={y(th.value) - 4} textAnchor="start" className="fill-[var(--muted)] text-[10px]">
                {th.label}
              </text>
            </g>
          ))}

          {/* data */}
          {segments.map((seg, i) =>
            seg.length === 1 ? (
              <circle key={i} cx={x(seg[0].t)} cy={y(seg[0].v!)} r={2} fill="var(--accent)" />
            ) : (
              <polyline
                key={i}
                points={seg.map((p) => `${x(p.t)},${y(p.v!)}`).join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ),
          )}

          {/* hover crosshair */}
          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={M.top} y2={M.top + plotH} stroke="var(--muted)" strokeWidth={1} />
              {hover.v != null && (
                <circle cx={x(hover.t)} cy={y(hover.v)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          )}
          <rect
            x={M.left}
            y={M.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute top-1 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-sm"
            style={{ left: Math.min(Math.max(x(hover.t) - 60, 0), width - 130) }}
          >
            <div className="text-muted">{new Date(hover.t).toLocaleTimeString()}</div>
            <div className="font-semibold tabular-nums">{hover.v == null ? "no reading (sensor error)" : `${hover.v.toFixed(decimals)} ${unit}`}</div>
          </div>
        )}
      </div>
    </figure>
  );
}
