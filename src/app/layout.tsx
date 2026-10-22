import type { Metadata, Viewport } from "next";
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
  // Installed on an iPhone home screen: full screen, and the page draws under
  // a see-through status bar (the red strip below keeps the clock readable).
  appleWebApp: { capable: true, title: "Footy Reacts", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#d5202a",
  // Lets env(safe-area-inset-top) report the notch and clock area on iPhones.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${workSans.variable} ${spaceMono.variable}`}>
      <body>
        {/* Zero height in a browser tab. In the installed app it sits behind the
            iPhone clock so white status text stays on red while the page scrolls. */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-red" />
        {children}
      </body>
    </html>
  );
}
