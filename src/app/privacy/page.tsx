import type { Metadata } from "next";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { CONTACTS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy — Footy Reacts",
  description: "What Footy Reacts collects (very little), what YouTube does when you press play, and how to reach us.",
};

/**
 * Written to match what the site does today. Anything new that touches
 * visitors (accounts, tipping, another tracker) has to be added here first.
 */
export default function PrivacyPage() {
  const contact = CONTACTS[0];

  return (
    <main className="min-h-screen">
      <Masthead />
      <article className="mx-auto max-w-2xl px-4 py-10 leading-relaxed text-ink-2 sm:px-5 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:uppercase [&_h2]:text-ink [&_p]:mt-3">
        <h1 className="font-display text-4xl uppercase leading-none text-ink">Privacy</h1>
        <p className="font-mono text-xs uppercase tracking-wider text-ink-3">Last updated 11 November 2026</p>

        <p>
          Footy Reacts collects as little as it can. There are no accounts, no sign-up and no forms,
          and we never sell or share data about you.
        </p>

        <h2>Videos</h2>
        <p>
          Every video is a YouTube embed from the creator&apos;s own channel. Before you press play,
          we only show a thumbnail image, which your browser loads from YouTube&apos;s image
          servers. When you press play, the video loads from YouTube in privacy-enhanced mode, and
          from then on YouTube (Google) handles it under{" "}
          <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
            Google&apos;s privacy policy
          </a>
          , which can include cookies.
        </p>

        <h2>Analytics</h2>
        <p>
          We count page views with Vercel Web Analytics to see which pages people use. It sets no
          cookies, does not follow you across other sites, and does not identify you: visitors are
          counted with an anonymous code that resets every day.
        </p>

        <h2>Hosting and your country</h2>
        <p>
          The site runs on Vercel, whose servers keep standard request logs (such as IP address and
          browser) for security and to keep the site running. We read the country your request
          comes from only to pick highlights that will actually play where you are, since some
          broadcasters lock videos to certain countries. We don&apos;t store it.
        </p>

        <h2>On your device</h2>
        <p>
          Your browser remembers two small settings on your own device: that you dismissed the
          &ldquo;add to home screen&rdquo; strip, and that you have seen the welcome line. They never
          leave your device, and clearing your browser&apos;s site data removes them.
        </p>

        <h2>Creators</h2>
        <p>
          The videos belong to their creators and their views count on the creators&apos; own
          channels. If you are a creator and would like your channel removed, get in touch and we
          will take it off.
        </p>

        <h2>Contact</h2>
        <p>
          {contact ? (
            <>
              Questions about privacy: {contact.label}{" "}
              <a href={contact.href} className="underline" target="_blank" rel="noopener noreferrer">
                {contact.value}
              </a>
              .
            </>
          ) : (
            "Questions about privacy: use the contact button at the top of any page."
          )}
        </p>

        <p className="mt-10">
          <Link href="/" className="font-bold text-red underline">
            Back to the matches
          </Link>
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
