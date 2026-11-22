import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AlertsBoard } from "@/components/telemetry/AlertsBoard";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Temperature, humidity, flame, sensor error and device offline alerts. One alert per ongoing condition; resolves automatically when the condition clears."
      />
      <AlertsBoard />
    </>
  );
}
