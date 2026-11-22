import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="This page does not exist in the dashboard." />
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Back to overview
      </Link>
    </>
  );
}
