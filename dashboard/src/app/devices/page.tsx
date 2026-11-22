import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DevicesView } from "@/components/DevicesView";

export const metadata: Metadata = { title: "Devices" };

export default function DevicesPage() {
  return (
    <>
      <PageHeader title="Devices" subtitle="ESP32 boards registered with the backend, their connection state and latest reading." />
      <DevicesView />
    </>
  );
}
