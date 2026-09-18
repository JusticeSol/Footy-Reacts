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

export const metadata: Metadata = {
  title: "Footy Reacts — every take on every match",
  description:
    "Pre- and post-match reactions from every creator, organised by fixture. Stop scrolling, start watching.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${workSans.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
