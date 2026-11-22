import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { VisionWorkbench } from "@/components/vision/VisionWorkbench";

export const metadata: Metadata = { title: "Vision" };

export default function VisionPage() {
  return (
    <>
      <PageHeader
        title="Vision"
        subtitle="Count and measure mealworm larvae from the tray camera. Segmentation runs on a hosted Roboflow model via the vision service."
      />
      <VisionWorkbench />
    </>
  );
}
