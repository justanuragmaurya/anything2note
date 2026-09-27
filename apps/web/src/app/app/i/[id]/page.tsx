import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/app/workspace/workspace";
import { getWorkspace, LIBRARY, type Anchor } from "@/lib/mock/app-data";

export function generateStaticParams() {
  return LIBRARY.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/app/i/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getWorkspace(id)?.item.title ?? "Not found" };
}

function initialAnchor(sp: Record<string, string | string[] | undefined>): Anchor | undefined {
  const t = Number(sp.t);
  if (typeof sp.t === "string" && Number.isFinite(t)) return { kind: "time", at: t };
  const p = Number(sp.p);
  if (typeof sp.p === "string" && Number.isFinite(p) && p > 0) return { kind: "page", page: p };
  return undefined;
}

export default async function ItemPage({ params, searchParams }: PageProps<"/app/i/[id]">) {
  const { id } = await params;
  const ws = getWorkspace(id);
  if (!ws) notFound();
  const initial = initialAnchor(await searchParams);
  return <Workspace key={id} ws={ws} initial={initial} />;
}
