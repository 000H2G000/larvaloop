import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, SampleDataBanner } from "@/components/ui";
import { SAMPLE_EXPERIMENT, SAMPLE_TRAYS, fmtDate, formulaById, trayStats } from "@/lib/sampleData";

export const metadata: Metadata = { title: "Trays" };

export default function TraysPage() {
  return (
    <>
      <PageHeader title="Trays" subtitle="Each tray is one rearing container with its own larvae batch and feed formula." />
      <SampleDataBanner phase={2} what="tray management" />

      <div className="grid gap-4 lg:grid-cols-3">
        {SAMPLE_TRAYS.map((tray) => {
          const f = formulaById(tray.formulaId)!;
          const s = trayStats(tray.trayCode);
          return (
            <article key={tray.trayCode} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="h-1.5" style={{ background: `var(--${tray.color})` }} aria-hidden />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{tray.name}</h2>
                    <p className="font-mono text-xs text-muted">{tray.trayCode}</p>
                  </div>
                  <Badge tone="ok">{tray.status}</Badge>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Item label="Larvae now" value={`${s.latest.larvaeCount} / ${tray.larvaeInitialCount}`} />
                  <Item label="Biomass" value={`${s.latest.estimatedBiomassGrams} g`} />
                  <Item label="Survival" value={`${(s.survival * 100).toFixed(1)} %`} />
                  <Item label="Stage" value={s.latest.developmentStage} />
                  <Item label="Started" value={fmtDate(tray.startDate)} />
                  <Item label="Week" value={`${s.latest.week} of 8`} />
                </dl>

                <div className="mt-5 rounded-xl bg-background p-3 text-sm">
                  <p className="text-xs text-muted">Feed formula</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <Link href="/feed-formulas" className="font-medium hover:underline">
                      {f.name}
                    </Link>
                    <span className="text-xs text-muted">{f.acornFlourPercentage}% acorn flour</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(f.acornFlourPercentage / 30) * 100}%` }} />
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted">
                  Part of{" "}
                  <Link href="/experiments" className="font-medium text-accent hover:underline">
                    {SAMPLE_EXPERIMENT.id}
                  </Link>
                  {" · "}
                  <Link href="/observations" className="hover:underline">
                    observations
                  </Link>
                  {" · "}
                  <Link href="/feeding" className="hover:underline">
                    feeding log
                  </Link>
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted">
        The live prototype tray is <span className="font-mono">TRAY_01</span>, monitored by{" "}
        <Link href="/telemetry" className="text-accent hover:underline">
          ESP32_TRAY_01
        </Link>
        .
      </p>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
