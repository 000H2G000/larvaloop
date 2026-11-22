import type { Metadata } from "next";
import { Badge, PageHeader, SampleDataBanner } from "@/components/ui";
import { SAMPLE_FORMULAS, SAMPLE_TRAYS } from "@/lib/sampleData";

export const metadata: Metadata = { title: "Feed formulas" };

export default function FeedFormulasPage() {
  return (
    <>
      <PageHeader
        title="Feed formulas"
        subtitle="Diets tested in the trials. Laboratory results are stored separately and never assumed: a formula is not considered safe until analysed."
      />
      <SampleDataBanner phase={5} what="feed formula management" />

      <div className="grid gap-4 lg:grid-cols-3">
        {SAMPLE_FORMULAS.map((f) => {
          const trays = SAMPLE_TRAYS.filter((t) => t.formulaId === f.id);
          return (
            <article key={f.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted">{f.id}</p>
                  <h2 className="font-semibold">{f.name}</h2>
                </div>
                {f.acornFlourPercentage === 0 ? <Badge>reference</Badge> : <Badge tone="warn">experimental</Badge>}
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Acorn flour</span>
                  <span className="text-2xl font-semibold tabular-nums">{f.acornFlourPercentage}%</span>
                </div>
                {/* composition bar: acorn flour vs. remaining substrate */}
                <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                  {f.acornFlourPercentage > 0 && <div className="rounded-full bg-accent" style={{ width: `${f.acornFlourPercentage}%` }} />}
                  <div className="flex-1 rounded-full bg-border" />
                </div>
              </div>

              <p className="mt-4 text-sm">{f.otherIngredients}</p>
              <p className="mt-1 text-sm text-muted">{f.description}</p>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Nutritional analysis</dt>
                  <dd>{f.nutritionalAnalysis ?? <Badge tone="neutral">pending lab</Badge>}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Tannin analysis</dt>
                  <dd>{f.tanninAnalysis ?? <Badge tone="neutral">pending lab</Badge>}</dd>
                </div>
              </dl>

              <p className="mt-4 rounded-xl bg-background p-3 text-xs text-muted">{f.notes}</p>
              <p className="mt-auto pt-4 text-xs text-muted">Used by: {trays.map((t) => t.name).join(", ") || "none"}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
