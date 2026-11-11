import type { MetadataRoute } from "next";
import { listFixturesForSitemap } from "@/lib/store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footy-reacts.vercel.app";

// Rebuilt at most hourly, so crawlers do not cost a database read each.
export const revalidate = 3600;

/** The boards, the privacy page and every synced match page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixtures = await listFixturesForSitemap();
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/?c=ucl`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    ...fixtures.map((f) => ({
      url: `${SITE_URL}/match/${f.slug}`,
      lastModified: f.kickoffUtc,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
