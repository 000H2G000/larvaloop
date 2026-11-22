"use client";

import { SAMPLE_TRAYS } from "@/lib/sampleData";

export function TrayFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [{ trayCode: "all", name: "All trays", color: null }, ...SAMPLE_TRAYS];
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1" role="group" aria-label="Tray">
      {options.map((t) => (
        <button
          key={t.trayCode}
          aria-pressed={value === t.trayCode}
          onClick={() => onChange(t.trayCode)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${value === t.trayCode ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}
        >
          {t.color && <span className="size-2 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />}
          {t.name}
        </button>
      ))}
    </div>
  );
}
