import type { Metadata } from "next";
import { ActionsView } from "@/components/app/actions/actions-view";

export const metadata: Metadata = { title: "Action items" };

export default function ActionsPage() {
  return <ActionsView />;
}
