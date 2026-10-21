import { Masthead } from "@/components/Masthead";
import { Ticker } from "@/components/Ticker";
import { FixtureRow } from "@/components/FixtureRow";
import { MatchdayNav } from "@/components/MatchdayNav";
import { WeekendGoals } from "@/components/Highlights";
import { CompetitionTabs } from "@/components/CompetitionTabs";
import { competitionByKey, PREMIER_LEAGUE } from "@/lib/competitions";
import { getBoard, getMatchdayHighlights, getRecentTakes } from "@/lib/store";
import { pickMatchdayHighlight } from "@/lib/highlights/select";
import { viewerCountry } from "@/lib/viewer";
import { dayHeading, groupByDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ md?: string; c?: string }>;
}) {
  const { md, c } = await searchParams;
  const competition = competitionByKey(c);
  const requested = md && /^\d+$/.test(md) ? Number(md) : undefined;

  const [board, recent, country] = await Promise.all([
    getBoard(requested, competition.id),
    getRecentTakes(12),
    viewerCountry(),
  ]);
  const days = groupByDay(board.fixtures, (f) => f.kickoffUtc);
  // The league's weekly all-goals video: the Champions League has no equivalent.
  const weekendGoals =
    board.matchday !== null && competition.id === PREMIER_LEAGUE.id
      ? pickMatchdayHighlight(await getMatchdayHighlights(board.matchday), country)
      : undefined;

  return (
    <main className="min-h-screen">
      <Masthead />
      <Ticker items={recent} />

      <div className="mx-auto max-w-5xl">
        <CompetitionTabs active={competition} />

        {board.matchday !== null && (
          <MatchdayNav
            matchdays={board.matchdays}
            active={board.matchday}
            competitionKey={competition.id === PREMIER_LEAGUE.id ? undefined : competition.key}
          />
        )}

        {weekendGoals && board.matchday !== null && (
          <WeekendGoals highlight={weekendGoals} matchday={board.matchday} />
        )}

        {days.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-2xl uppercase text-ink-2">
              {competition.id === PREMIER_LEAGUE.id ? "No fixtures loaded" : `No ${competition.name} fixtures yet`}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-3">
              {competition.id === PREMIER_LEAGUE.id ? "run npm run sync:fixtures" : "they appear as the draw is played"}
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
          Footy Reacts embeds — it never re-hosts. Every view counts on the creator&apos;s own
          channel.
        </p>
      </footer>
    </main>
  );
}
