import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export type Tone = "ok" | "warn" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-accent-soft text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Mandatory on every page that shows sample (non-measured) data. */
export function SampleDataBanner({ phase, what }: { phase: number; what: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm" role="note">
      <Icon name="info" className="mt-0.5 size-4 shrink-0 text-warn" />
      <p>
        <span className="font-semibold text-warn">Sample data.</span> This page previews {what} with illustrative values, not
        measurements from the farm. Real data replaces it when backend Phase {phase} ships.
      </p>
    </div>
  );
}

export function StatCard({ label, value, note, tone, icon }: { label: string; value: ReactNode; note?: ReactNode; tone?: Tone; icon?: ReactNode }) {
  const ring = tone === "danger" ? "border-danger/50 bg-danger-soft" : tone === "warn" ? "border-warn/50 bg-warn-soft" : "border-border bg-surface";
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function DataTable({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-background/60">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2.5 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
