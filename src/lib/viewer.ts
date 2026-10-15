import { headers } from "next/headers";

/**
 * The visitor's country (ISO 3166 alpha-2), from the header Vercel adds to
 * every request. Undefined locally and anywhere else the header is absent, in
 * which case only highlights without region locks are offered.
 *
 * Server components only. Both pages that call it already render per request.
 */
export async function viewerCountry(): Promise<string | undefined> {
  const value = (await headers()).get("x-vercel-ip-country");
  return value && /^[A-Z]{2}$/.test(value) ? value : undefined;
}
