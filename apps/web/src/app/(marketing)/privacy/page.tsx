import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { PRIVACY } from "@/lib/mock/marketing-legal";

export const metadata: Metadata = {
  title: PRIVACY.metaTitle,
  description: PRIVACY.description,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <LegalPage doc={PRIVACY} />;
}
