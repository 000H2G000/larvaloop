import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TelemetryDashboard } from "@/components/telemetry/TelemetryDashboard";

export const metadata: Metadata = { title: "Telemetry" };

export default function TelemetryPage() {
  return (
    <>
      <PageHeader
        title="Telemetry"
        subtitle="Live ESP32 readings: DHT22 temperature and humidity, flame sensor and ventilation servo."
      />
      <TelemetryDashboard />
    </>
  );
}
