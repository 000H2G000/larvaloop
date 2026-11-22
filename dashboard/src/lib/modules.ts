import type { IconName } from "@/components/icons";

/**
 * Dashboard modules, mapped to the backend REST modules in backend.md §8.
 * live   = real data from the backend.
 * sample = UI preview with clearly labelled sample data until the backend phase ships.
 */
export type ModuleMode = "live" | "sample";

export interface DashboardModule {
  slug: string;
  label: string;
  description: string;
  group: "Monitor" | "Farm" | "Insights";
  icon: IconName;
  mode: ModuleMode;
  /** Backend phase that delivers (or delivered) the real API. */
  phase: number;
}

export const MODULES: DashboardModule[] = [
  { slug: "telemetry", label: "Telemetry", group: "Monitor", icon: "telemetry", mode: "live", phase: 3, description: "Live temperature, humidity, flame sensor and ventilation from the tray ESP32." },
  { slug: "alerts", label: "Alerts", group: "Monitor", icon: "alerts", mode: "live", phase: 3, description: "Heat, humidity, flame, sensor and offline alerts with acknowledge and resolve." },
  { slug: "images", label: "Vision", group: "Monitor", icon: "vision", mode: "live", phase: 6, description: "AI larvae counting and length measurement from the tray camera." },
  { slug: "devices", label: "Devices", group: "Monitor", icon: "devices", mode: "live", phase: 2, description: "Registered ESP32 boards, connection state and last contact." },
  { slug: "trays", label: "Trays", group: "Farm", icon: "trays", mode: "sample", phase: 2, description: "Rearing trays: status, start date, larvae count and feed formula." },
  { slug: "experiments", label: "Experiments", group: "Farm", icon: "experiments", mode: "sample", phase: 5, description: "Acorn-flour feeding trials: objective, method, trays and results." },
  { slug: "feed-formulas", label: "Feed formulas", group: "Farm", icon: "formulas", mode: "sample", phase: 5, description: "Formulations by acorn-flour percentage, with lab results kept separate." },
  { slug: "feeding", label: "Feeding log", group: "Farm", icon: "feeding", mode: "sample", phase: 5, description: "Feed given per tray: formula, grams and date." },
  { slug: "observations", label: "Observations", group: "Farm", icon: "observations", mode: "sample", phase: 5, description: "Weekly counts, biomass, mortality and development stage." },
  { slug: "analytics", label: "Analytics", group: "Insights", icon: "analytics", mode: "sample", phase: 7, description: "Growth curves, feed conversion and environment summaries." },
];

export const GROUPS = ["Monitor", "Farm", "Insights"] as const;

export const getModule = (slug: string) => MODULES.find((m) => m.slug === slug);
