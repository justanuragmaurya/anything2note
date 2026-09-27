import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { REFUNDS } from "@/lib/mock/marketing-legal";

export const metadata: Metadata = {
  title: REFUNDS.metaTitle,
  description: REFUNDS.description,
  alternates: { canonical: "/refunds" },
};

export default function Page() {
  return <LegalPage doc={REFUNDS} />;
}
