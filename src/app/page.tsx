import { InstallPrompt } from "@/components/InstallPrompt";
import { SiteFooter } from "@/components/SiteFooter";
import { Welcome } from "@/components/Welcome";
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
  // The competition's own all-goals video: the Premier League's for the
  // weekend, UEFA's for the Champions League matchday.
  const weekendGoals =
    board.matchday !== null
      ? pickMatchdayHighlight(await getMatchdayHighlights(board.matchday, competition.id), country)
      : undefined;

  return (
    <main className="min-h-screen">
      <Masthead />
      <Ticker items={recent} />
      <Welcome />
      <InstallPrompt />

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
          <WeekendGoals
            highlight={weekendGoals}
            matchday={board.matchday}
            heading={competition.id === PREMIER_LEAGUE.id ? "Weekend goals" : "Matchday goals"}
          />
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
              <h2 className="sticky top-[env(safe-area-inset-top)] z-10 border-b border-ink bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2 sm:px-5 sm:text-xs">
                {dayHeading(dayFixtures[0].kickoffUtc)}
              </h2>
              {dayFixtures.map((fixture) => (
                <FixtureRow key={fixture.id} fixture={fixture} />
              ))}
            </section>
          ))
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
