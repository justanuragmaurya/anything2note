import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { TERMS } from "@/lib/mock/marketing-legal";

export const metadata: Metadata = {
  title: TERMS.metaTitle,
  description: TERMS.description,
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
