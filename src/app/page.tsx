import { Masthead } from "@/components/Masthead";
import { Ticker } from "@/components/Ticker";
import { FixtureRow } from "@/components/FixtureRow";
import { getFixtureBoard, getRecentTakes } from "@/lib/store";
import { dayHeading, groupByDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [fixtures, recent] = await Promise.all([getFixtureBoard({ days: 10 }), getRecentTakes(12)]);
  const days = groupByDay(fixtures, (f) => f.kickoffUtc);

  return (
    <main className="min-h-screen">
      <Masthead />
      <Ticker items={recent} />

      <div className="mx-auto max-w-5xl">
        {days.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-2xl text-ink-2">NO FIXTURES LOADED</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-3">
              run npm run sync:fixtures
            </p>
          </div>
        ) : (
          days.map(([key, dayFixtures]) => (
            <section key={key}>
              <h2 className="sticky top-0 z-10 border-b border-ink bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2 sm:px-5 sm:text-xs">
                {dayHeading(dayFixtures[0].kickoffUtc)}
              </h2>
              {dayFixtures.map((fixture) => (
                <FixtureRow key={fixture.id} fixture={fixture} />
              ))}
            </section>
          ))
        )}
      </div>

      <footer className="mx-auto max-w-5xl px-4 py-10 sm:px-5">
        <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wider text-ink-3">
          Red React embeds — it never re-hosts. Every view counts on the creator&apos;s own channel.
        </p>
      </footer>
    </main>
  );
}
