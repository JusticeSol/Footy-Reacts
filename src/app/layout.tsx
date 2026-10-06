import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The same Google Fonts files (latin subset, OFL), kept in the repo rather than
// fetched at compile time. Under Turbopack the fetch failed on this machine and
// every page fell back to Arial; local files need no network in either bundler.
const anton = localFont({
  src: "./fonts/Anton-400.woff2",
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});
const workSans = localFont({
  src: "./fonts/WorkSans-100-900.woff2",
  weight: "100 900",
  variable: "--font-work-sans",
  display: "swap",
});
const spaceMono = localFont({
  src: [
    { path: "./fonts/SpaceMono-400.woff2", weight: "400" },
    { path: "./fonts/SpaceMono-700.woff2", weight: "700" },
  ],
  variable: "--font-space-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footy-reacts.vercel.app";
const TAGLINE =
  "Pre- and post-match reactions from every creator, organised by fixture. Stop scrolling, start watching.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Footy Reacts — every take on every match",
  description: TAGLINE,
  // Without these a shared link unfurls as a bare URL, which wastes the one
  // impression a post gets.
  openGraph: {
    type: "website",
    siteName: "Footy Reacts",
    title: "Footy Reacts — every take on every match",
    description: TAGLINE,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Footy Reacts — every take on every match",
    description: TAGLINE,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${workSans.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
