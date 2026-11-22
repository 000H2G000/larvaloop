import type { Metadata } from "next";
import { PageHeader, SampleDataBanner } from "@/components/ui";
import { ObservationsTable } from "@/components/sample/ObservationsTable";

export const metadata: Metadata = { title: "Observations" };

export default function ObservationsPage() {
  return (
    <>
      <PageHeader
        title="Observations"
        subtitle="Weekly manual measurements by the researcher: larvae count, biomass from a weighed sample, mortality and development stage."
      />
      <SampleDataBanner phase={5} what="researcher observations" />
      <ObservationsTable />
    </>
  );
}
