import type { Metadata } from "next";
import { Anton, Space_Mono, Work_Sans } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
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
