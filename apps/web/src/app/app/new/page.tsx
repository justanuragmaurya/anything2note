import type { Metadata } from "next";
import { NewFlow } from "@/components/app/new/new-flow";

export const metadata: Metadata = { title: "New note" };

export default function NewPage() {
  return <NewFlow />;
}
