/**
 * SAMPLE DATA - illustrative values for UI previews only.
 * Not measurements. Never sent to the backend or mixed with real tray data.
 * Pages using it must render <SampleDataBanner />.
 * Shapes follow backend.md §4 so swapping to the real API is a data-source change.
 */

export interface SampleFormula {
  id: string;
  name: string;
  acornFlourPercentage: number;
  otherIngredients: string;
  description: string;
  nutritionalAnalysis: string | null; // null = no lab result yet (never assumed)
  tanninAnalysis: string | null;
  notes: string;
}

export interface SampleTray {
  trayCode: string;
  name: string;
  status: "active" | "planned" | "harvested";
  startDate: string;
  larvaeInitialCount: number;
  formulaId: string;
  experimentId: string;
  color: "series-1" | "series-2" | "series-3";
}

export interface SampleObservation {
  trayCode: string;
  week: number;
  observationDate: string;
  larvaeCount: number;
  estimatedBiomassGrams: number;
  mortalityCount: number; // cumulative
  developmentStage: string;
}

export interface SampleFeeding {
  id: string;
  trayCode: string;
  formulaId: string;
  quantityGrams: number;
  feedingDate: string;
  notes: string;
}

export const SAMPLE_FORMULAS: SampleFormula[] = [
  {
    id: "CTRL",
    name: "Control (wheat bran)",
    acornFlourPercentage: 0,
    otherIngredients: "Wheat bran 100% · carrot slices for moisture",
    description: "Standard rearing substrate, the reference diet.",
    nutritionalAnalysis: null,
    tanninAnalysis: null,
    notes: "Baseline for comparison.",
  },
  {
    id: "AF-15",
    name: "Acorn flour 15%",
    acornFlourPercentage: 15,
    otherIngredients: "Cork-oak acorn flour 15% · wheat bran 85% · carrot slices",
    description: "Low substitution of bran with Quercus suber acorn flour.",
    nutritionalAnalysis: null,
    tanninAnalysis: null,
    notes: "Experimental. Not validated as nutritionally safe; tannin content to be measured.",
  },
  {
    id: "AF-30",
    name: "Acorn flour 30%",
    acornFlourPercentage: 30,
    otherIngredients: "Cork-oak acorn flour 30% · wheat bran 70% · carrot slices",
    description: "High substitution to test tolerance limits.",
    nutritionalAnalysis: null,
    tanninAnalysis: null,
    notes: "Experimental. Watch mortality: tannins may reduce palatability.",
  },
];

export const SAMPLE_EXPERIMENT = {
  id: "EXP-2026-01",
  name: "Acorn flour substitution trial",
  status: "running" as const,
  startDate: "2026-10-08",
  endDate: "2026-12-03",
  objective: "Measure how replacing 0%, 15% and 30% of wheat bran with cork-oak acorn flour affects mealworm growth, survival and feed conversion.",
  methodology: [
    "3 trays, 500 larvae each, same age batch, same room conditions (monitored by the tray ESP32).",
    "Feed twice a week with the tray's formula; log every feeding in grams.",
    "Weekly observation: count, weigh a sample and estimate biomass, record mortality.",
    "Camera images analysed weekly to cross-check counts and body length.",
  ],
  results: null as string | null, // no results until the trial ends
  notes: "Interim figures in Analytics are sample values for the UI preview.",
};

export const SAMPLE_TRAYS: SampleTray[] = [
  { trayCode: "TRAY_A", name: "Tray A · control", status: "active", startDate: "2026-10-08", larvaeInitialCount: 500, formulaId: "CTRL", experimentId: "EXP-2026-01", color: "series-1" },
  { trayCode: "TRAY_B", name: "Tray B · 15% acorn", status: "active", startDate: "2026-10-08", larvaeInitialCount: 500, formulaId: "AF-15", experimentId: "EXP-2026-01", color: "series-2" },
  { trayCode: "TRAY_C", name: "Tray C · 30% acorn", status: "active", startDate: "2026-10-08", larvaeInitialCount: 500, formulaId: "AF-30", experimentId: "EXP-2026-01", color: "series-3" },
];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Weekly biomass (g) and cumulative mortality per tray, weeks 0-6.
const CURVES: Record<string, { biomass: number[]; mortality: number[] }> = {
  TRAY_A: { biomass: [30, 38, 48, 60, 73, 86, 98], mortality: [0, 3, 5, 8, 10, 12, 15] },
  TRAY_B: { biomass: [30, 37, 47, 58, 70, 82, 93], mortality: [0, 4, 7, 9, 12, 15, 18] },
  TRAY_C: { biomass: [30, 35, 42, 51, 60, 69, 77], mortality: [0, 6, 11, 15, 20, 24, 29] },
};

const STAGES = ["early larva", "larva", "larva", "larva", "late larva", "late larva", "late larva"];

export const SAMPLE_OBSERVATIONS: SampleObservation[] = SAMPLE_TRAYS.flatMap((tray) =>
  CURVES[tray.trayCode].biomass.map((g, week) => ({
    trayCode: tray.trayCode,
    week,
    observationDate: addDays(tray.startDate, week * 7),
    larvaeCount: tray.larvaeInitialCount - CURVES[tray.trayCode].mortality[week],
    estimatedBiomassGrams: g,
    mortalityCount: CURVES[tray.trayCode].mortality[week],
    developmentStage: STAGES[week],
  })),
);

// Two feedings per week for weeks 0-5, growing portions: 12 + 3·week grams.
export const SAMPLE_FEEDINGS: SampleFeeding[] = SAMPLE_TRAYS.flatMap((tray) =>
  [0, 1, 2, 3, 4, 5].flatMap((week) =>
    [0, 3].map((offset, i) => ({
      id: `${tray.trayCode}-w${week}-${i}`,
      trayCode: tray.trayCode,
      formulaId: tray.formulaId,
      quantityGrams: 12 + week * 3,
      feedingDate: addDays(tray.startDate, week * 7 + offset),
      notes: i === 0 ? "Fresh carrot added" : "",
    })),
  ),
).sort((a, b) => b.feedingDate.localeCompare(a.feedingDate));

export const formulaById = (id: string) => SAMPLE_FORMULAS.find((f) => f.id === id);
export const trayByCode = (code: string) => SAMPLE_TRAYS.find((t) => t.trayCode === code);

/** Per-tray summary derived only from the sample observations and feedings above. */
export const trayStats = (trayCode: string) => {
  const obs = SAMPLE_OBSERVATIONS.filter((o) => o.trayCode === trayCode).sort((a, b) => a.week - b.week);
  const first = obs[0];
  const last = obs[obs.length - 1];
  const feed = SAMPLE_FEEDINGS.filter((f) => f.trayCode === trayCode).reduce((s, f) => s + f.quantityGrams, 0);
  const gain = last.estimatedBiomassGrams - first.estimatedBiomassGrams;
  return {
    latest: last,
    feedGrams: feed,
    biomassGain: gain,
    fcr: gain > 0 ? feed / gain : null,
    survival: last.larvaeCount / (first.larvaeCount + first.mortalityCount),
  };
};

export const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
