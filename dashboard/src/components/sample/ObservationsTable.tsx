"use client";

import { useState } from "react";
import { Card, DataTable } from "@/components/ui";
import { SAMPLE_OBSERVATIONS, fmtDate, trayByCode } from "@/lib/sampleData";
import { TrayFilter } from "./TrayFilter";

export function ObservationsTable() {
  const [tray, setTray] = useState("all");
  const rows = SAMPLE_OBSERVATIONS.filter((o) => tray === "all" || o.trayCode === tray).sort(
    (a, b) => b.week - a.week || a.trayCode.localeCompare(b.trayCode),
  );

  return (
    <Card title={`${rows.length} observations`} action={<TrayFilter value={tray} onChange={setTray} />}>
      <DataTable
        caption="Weekly observations"
        head={["Week", "Date", "Tray", "Larvae", "Biomass", "Mean mass", "Mortality (cum.)", "Stage"]}
        rows={rows.map((o) => {
          const t = trayByCode(o.trayCode)!;
          return [
            `W${o.week}`,
            fmtDate(o.observationDate),
            <span key="t" className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />
              {t.name}
            </span>,
            o.larvaeCount,
            `${o.estimatedBiomassGrams} g`,
            `${((o.estimatedBiomassGrams / o.larvaeCount) * 1000).toFixed(0)} mg`,
            o.mortalityCount,
            o.developmentStage,
          ];
        })}
      />
    </Card>
  );
}
