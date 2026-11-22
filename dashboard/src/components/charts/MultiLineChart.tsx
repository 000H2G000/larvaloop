"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/ui";

export interface Series {
  key: string;
  label: string;
  /** CSS custom property name of a categorical slot, e.g. "series-1". Assigned per entity, never by rank. */
  color: "series-1" | "series-2" | "series-3";
  points: { x: number; y: number }[];
}

interface Props {
  title: string;
  unit: string;
  series: Series[];
  xLabel: (x: number) => string;
  decimals?: number;
  /** Start the y-axis at 0 (magnitudes). Turn off for values in a narrow band, e.g. survival %. */
  zeroBaseline?: boolean;
}

const HEIGHT = 240;
const M = { top: 14, right: 92, bottom: 26, left: 44 };

const niceTicks = (min: number, max: number, count = 4) => {
  const raw = (max - min || 1) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
};

/** Up to 3 series on one shared axis. Legend + direct end labels so identity is never colour alone. */
export function MultiLineChart({ title, unit, series, xLabel, decimals = 0, zeroBaseline = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(300, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b), [series]);
  const { yMin, yMax, yTicks } = useMemo(() => {
    const ys = series.flatMap((s) => s.points.map((p) => p.y));
    const dataMin = Math.min(...ys);
    const dataMax = Math.max(...ys);
    const pad = Math.max((dataMax - dataMin) * 0.15, 0.5);
    const lo = zeroBaseline ? Math.min(0, dataMin) : dataMin - pad;
    const hi = zeroBaseline ? dataMax * 1.08 : dataMax + pad;
    return { yMin: lo, yMax: hi, yTicks: niceTicks(lo, hi) };
  }, [series, zeroBaseline]);

  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const xMin = xs[0] ?? 0;
  const xMax = xs[xs.length - 1] ?? 1;
  const x = (v: number) => M.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;
  const fmt = (v: number) => `${v.toFixed(decimals)} ${unit}`;

  // Direct end labels, nudged apart so they never overlap.
  const endLabels = useMemo(() => {
    const labels = series
      .map((s) => ({ s, last: s.points[s.points.length - 1] }))
      .filter((l) => l.last)
      .map((l) => ({ ...l, ty: y(l.last.y) }))
      .sort((a, b) => a.ty - b.ty);
    for (let i = 1; i < labels.length; i++) if (labels[i].ty - labels[i - 1].ty < 14) labels[i].ty = labels[i - 1].ty + 14;
    return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, width, yMin, yMax]);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = xMin + ((e.clientX - r.left) / r.width) * (xMax - xMin);
    setHoverX(xs.reduce((best, cur) => (Math.abs(cur - v) < Math.abs(best - v) ? cur : best), xs[0]));
  };

  return (
    <figure className="rounded-2xl border border-border bg-surface p-5">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex flex-wrap items-center gap-4">
          <ul className="flex flex-wrap gap-3 text-xs text-muted" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: `var(--${s.color})` }} aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:text-foreground">
            {showTable ? "Chart" : "Table"}
          </button>
        </div>
      </figcaption>

      {showTable ? (
        <DataTable
          caption={title}
          head={["", ...series.map((s) => s.label)]}
          rows={xs.map((xv) => [xLabel(xv), ...series.map((s) => {
            const p = s.points.find((pt) => pt.x === xv);
            return p ? fmt(p.y) : "—";
          })])}
        />
      ) : (
        <div ref={wrapRef} className="relative">
          <svg width={width} height={HEIGHT} role="img" aria-label={`${title} by ${series.map((s) => s.label).join(", ")}`} className="block">
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={M.left + plotW} y1={y(v)} y2={y(v)} stroke="var(--border)" />
                <text x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--muted)] text-[10px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            {xs.map((xv) => (
              <text key={xv} x={x(xv)} y={HEIGHT - 8} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                {xLabel(xv)}
              </text>
            ))}

            {series.map((s) => (
              <polyline
                key={s.key}
                points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
                fill="none"
                stroke={`var(--${s.color})`}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {endLabels.map(({ s, last, ty }) => (
              <text key={s.key} x={x(last.x) + 8} y={ty} dominantBaseline="middle" className="fill-[var(--foreground)] text-[11px]">
                {s.label}
              </text>
            ))}

            {hoverX != null && (
              <g pointerEvents="none">
                <line x1={x(hoverX)} x2={x(hoverX)} y1={M.top} y2={M.top + plotH} stroke="var(--muted)" />
                {series.map((s) => {
                  const p = s.points.find((pt) => pt.x === hoverX);
                  return p ? <circle key={s.key} cx={x(p.x)} cy={y(p.y)} r={4} fill={`var(--${s.color})`} stroke="var(--surface)" strokeWidth={2} /> : null;
                })}
              </g>
            )}
            <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHoverX(null)} />
          </svg>

          {hoverX != null && (
            <div
              className="pointer-events-none absolute top-2 min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md"
              style={{ left: Math.min(Math.max(x(hoverX) + 12, 0), width - 170) }}
            >
              <div className="mb-1 font-medium">{xLabel(hoverX)}</div>
              {series.map((s) => {
                const p = s.points.find((pt) => pt.x === hoverX);
                return (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="size-2 rounded-full" style={{ background: `var(--${s.color})` }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums">{p ? fmt(p.y) : "—"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
