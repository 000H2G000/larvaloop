import type { Metadata } from "next";
import { PageHeader, SampleDataBanner } from "@/components/ui";
import { FeedingLog } from "@/components/sample/FeedingLog";

export const metadata: Metadata = { title: "Feeding log" };

export default function FeedingPage() {
  return (
    <>
      <PageHeader title="Feeding log" subtitle="Every feeding is logged in grams per tray, so feed conversion can be calculated from real intake." />
      <SampleDataBanner phase={5} what="the feeding log" />
      <FeedingLog />
    </>
  );
}
