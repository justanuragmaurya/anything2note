import type { Metadata } from "next";
import type { Anchor } from "@a2n/shared";
import { WorkspaceLoader } from "@/components/app/workspace/workspace";

// The session cookie belongs to the API origin, so the item loads in the browser (the tab
// title is set there once it arrives).
export const metadata: Metadata = { title: "Note" };

function initialAnchor(sp: Record<string, string | string[] | undefined>): Anchor | undefined {
  const t = Number(sp.t);
  if (typeof sp.t === "string" && Number.isFinite(t)) return { kind: "time", at: t };
  const p = Number(sp.p);
  if (typeof sp.p === "string" && Number.isFinite(p) && p > 0) return { kind: "page", page: p };
  return undefined;
}

export default async function ItemPage({ params, searchParams }: PageProps<"/app/i/[id]">) {
  const { id } = await params;
  const initial = initialAnchor(await searchParams);
  return <WorkspaceLoader key={id} id={id} initial={initial} />;
}
