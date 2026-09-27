import type { MetadataRoute } from "next";
import { USE_CASE_SLUGS } from "@/lib/mock/marketing-use-cases";

const BASE = "https://anything2note.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/pricing", "/privacy", "/terms", "/refunds"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.5,
  }));
  const useCases = USE_CASE_SLUGS.map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  return [...staticPages, ...useCases];
}
