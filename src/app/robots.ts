import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footy-reacts.vercel.app";

/**
 * Everything readable is open to crawlers. /studio is deliberately not named:
 * it is already noindex and key-gated, and robots.txt is public, so listing it
 * would only advertise it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
