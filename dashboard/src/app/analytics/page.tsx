import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AnalyticsView } from "@/components/sample/AnalyticsView";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="Live environment summary from the tray, plus growth and feed-conversion curves for the feeding trial." />
      <AnalyticsView />
    </>
  );
}
