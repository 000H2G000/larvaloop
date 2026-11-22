"use client";

import { useState } from "react";
import { Card, DataTable, StatCard } from "@/components/ui";
import { SAMPLE_FEEDINGS, SAMPLE_TRAYS, fmtDate, formulaById, trayByCode } from "@/lib/sampleData";
import { TrayFilter } from "./TrayFilter";

export function FeedingLog() {
  const [tray, setTray] = useState("all");
  const rows = SAMPLE_FEEDINGS.filter((f) => tray === "all" || f.trayCode === tray);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {SAMPLE_TRAYS.map((t) => {
          const total = SAMPLE_FEEDINGS.filter((f) => f.trayCode === t.trayCode).reduce((s, f) => s + f.quantityGrams, 0);
          const n = SAMPLE_FEEDINGS.filter((f) => f.trayCode === t.trayCode).length;
          return (
            <StatCard
              key={t.trayCode}
              label={t.name}
              value={`${total} g`}
              note={`${n} feedings · ${formulaById(t.formulaId)!.name}`}
              icon={<span className="size-2.5 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />}
            />
          );
        })}
      </div>

      <Card title={`${rows.length} feedings`} action={<TrayFilter value={tray} onChange={setTray} />}>
        <DataTable
          caption="Feeding log"
          head={["Date", "Tray", "Formula", "Quantity", "Notes"]}
          rows={rows.map((f) => {
            const t = trayByCode(f.trayCode)!;
            return [
              fmtDate(f.feedingDate),
              <span key="t" className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />
                {t.name}
              </span>,
              formulaById(f.formulaId)!.name,
              `${f.quantityGrams} g`,
              <span key="n" className="text-muted">{f.notes || "—"}</span>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
