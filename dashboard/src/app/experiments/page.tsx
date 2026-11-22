import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, SampleDataBanner } from "@/components/ui";
import { SAMPLE_EXPERIMENT as E, SAMPLE_TRAYS, fmtDate, formulaById, trayStats } from "@/lib/sampleData";

export const metadata: Metadata = { title: "Experiments" };
export const revalidate = 3600;

export default function ExperimentsPage() {
  const TODAY = new Date();
  const start = new Date(`${E.startDate}T00:00:00Z`).getTime();
  const end = new Date(`${E.endDate}T00:00:00Z`).getTime();
  const progress = Math.min(1, Math.max(0, (TODAY.getTime() - start) / (end - start)));
  const week = Math.min(8, Math.floor((TODAY.getTime() - start) / (7 * 86_400_000)));

  return (
    <>
      <PageHeader title="Experiments" subtitle="Feeding trials that test acorn flour as a mealworm feed ingredient." />
      <SampleDataBanner phase={5} what="experiment tracking" />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted">{E.id}</p>
            <h2 className="mt-0.5 text-lg font-semibold">{E.name}</h2>
          </div>
          <Badge tone="ok">{E.status}</Badge>
        </div>
        <p className="mt-3 max-w-3xl text-sm">{E.objective}</p>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted">
            <span>Start {fmtDate(E.startDate)}</span>
            <span>Week {week} of 8</span>
            <span>End {fmtDate(E.endDate)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Method</h3>
            <ol className="space-y-3">
              {E.methodology.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">Trays in this trial</h3>
            <ul className="space-y-2">
              {SAMPLE_TRAYS.map((t) => {
                const f = formulaById(t.formulaId)!;
                const s = trayStats(t.trayCode);
                return (
                  <li key={t.trayCode} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="size-2.5 rounded-full" style={{ background: `var(--${t.color})` }} aria-hidden />
                      <span className="font-medium">{t.name}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {f.acornFlourPercentage}% acorn · {s.latest.larvaeCount} larvae · {s.latest.estimatedBiomassGrams} g
                    </span>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-6 mb-2 text-sm font-semibold">Results</h3>
            <p className="rounded-xl bg-background p-4 text-sm text-muted">
              {E.results ?? "No results yet: the trial is still running. Conclusions are written only from real measurements at the end."}{" "}
              <Link href="/analytics" className="text-accent hover:underline">
                Interim curves →
              </Link>
            </p>
          </section>
        </div>
      </Card>
    </>
  );
}
