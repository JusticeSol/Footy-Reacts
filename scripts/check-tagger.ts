import { getRepo, TAG_MIN_CONFIDENCE } from "../src/lib/repo";
import { prefilter } from "../src/lib/tagger";

/**
 * Smoke test for the tagging heuristic — no API keys, no model call.
 *
 * Run with: npm run check:tagger
 * Every case here is a real shape of title that reaction creators publish.
 */

interface Case {
  name: string;
  title: string;
  description?: string;
  publishedAt: string;
  clubs: string[];
  /** Omit when the fixture does not matter, only that it stays unpublished. */
  expectFixture?: string | null;
  expectPhase?: "pre" | "post";
  /** Asserts the top candidate scores under TAG_MIN_CONFIDENCE, so the UI hides it. */
  expectBelowFloor?: boolean;
}

async function main() {
  // Always runs against the local seed/JSON store: these are fixed cases, not
  // a check of whatever happens to be in the database.
  const repo = getRepo();
  const [teamList, fixtures] = await Promise.all([repo.listTeams(), repo.listFixtures()]);
  const teams = new Map(teamList.map((t) => [t.id, t]));
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  // Cases are written relative to kickoff so they never go stale.
  //   seed-1 = Arsenal v Chelsea, seed-2 = Liverpool v Man United
  const at = (id: string, offsetMinutes: number) => {
    const fixture = byId.get(id);
    if (!fixture) throw new Error(`seed fixture ${id} is missing`);
    return new Date(Date.parse(fixture.kickoffUtc) + offsetMinutes * 60_000).toISOString();
  };

  const cases: Case[] = [
    {
      name: "explicit post-match reaction",
      title: "Arsenal 2-1 Chelsea | Fan Reactions & Player Ratings",
      publishedAt: at("seed-1", 130),
      clubs: ["fd-57"],
      expectFixture: "seed-1",
      expectPhase: "post",
    },
    {
      name: "explicit preview",
      title: "Arsenal vs Chelsea PREVIEW | Team News & Predictions",
      publishedAt: at("seed-1", -20 * 60),
      clubs: ["fd-57"],
      expectFixture: "seed-1",
      expectPhase: "pre",
    },
    {
      name: "nicknames only, rival channel",
      title: "Spurs fan reacts to the Gunners collapse",
      publishedAt: at("seed-1", 180),
      clubs: ["fd-73"],
      expectFixture: "seed-1",
      expectPhase: "post",
    },
    {
      name: "vague title, saved by club affinity",
      title: "MATCHDAY LIVE! Build up starts now",
      publishedAt: at("seed-2", -90),
      clubs: ["fd-66"],
      expectFixture: "seed-2",
      expectPhase: "pre",
    },
    {
      name: "shorthand club names",
      title: "LIV v MAN UTD: instant reaction from Anfield",
      publishedAt: at("seed-2", 125),
      clubs: ["fd-64"],
      expectFixture: "seed-2",
      expectPhase: "post",
    },
    {
      name: "off-topic video matches nothing",
      title: "Transfer window round-up: who is moving in January?",
      publishedAt: at("seed-1", -40 * 24 * 60),
      clubs: ["fd-57"],
      expectFixture: null,
    },
    // Both of the following were live false positives found by debug:uploads
    // on the first multi-club creator. Affinity plus proximity alone reached
    // the 0.55 publish floor with nothing else going for them.
    {
      name: "unrelated international, multi-club creator",
      title: "NIGERIA 0-1 COLOMBIA U20 Women's World Cup #falconets",
      publishedAt: at("seed-2", -70),
      clubs: ["fd-57", "fd-66", "fd-61", "fd-64", "fd-65"],
      // A candidate may still be produced — what matters is that it scores too
      // low to ever be shown.
      expectBelowFloor: true,
    },
    {
      // "FT." here is "featuring", not full time — it used to score as match
      // content and reached the match page.
      name: "guest credits are not a full-time marker",
      title: "SUPER EAGLES CALL UP LIST (FT. Kurotams, Henry, Cali & Mekele)",
      publishedAt: at("seed-1", 300),
      clubs: ["fd-57", "fd-66", "fd-61"],
      expectBelowFloor: true,
    },
    {
      // Club channels post a daily bulletin that names the club and lands
      // near a kickoff, but is about everything except the match.
      name: "club news bulletin stays hidden",
      title: "Carrick Can't WIN! Scary Manager CONFESSION! Man Utd News",
      publishedAt: at("seed-2", 200),
      clubs: ["fd-66"],
      expectBelowFloor: true,
    },
    {
      // The exception: team news before a game is real pre-match content.
      name: "team news before kickoff still counts",
      title: "Liverpool vs Man United TEAM NEWS | Confirmed Line Ups",
      publishedAt: at("seed-2", -60),
      clubs: ["fd-66"],
      expectFixture: "seed-2",
      expectPhase: "pre",
    },
    {
      name: "on-topic club, not about the match",
      title: "International Break Is A Good Thing For Chelsea!",
      publishedAt: at("seed-1", 400),
      clubs: ["fd-61"],
      expectBelowFloor: true,
    },
    // Live false positives on Chelsea v Man United (2026-10-31): a Man United
    // creator's general club talk days out, with the fixture's clubs named only
    // in the description, published as pre-match.
    {
      name: "club talk days before kickoff stays hidden",
      title: "The Truth About Michael Carrick's Manchester United Tenure",
      description: "Where does Carrick go from here with Liverpool up next for Manchester United?",
      publishedAt: at("seed-2", -3 * 24 * 60),
      clubs: ["fd-66"],
      expectBelowFloor: true,
    },
    {
      name: "a rant days before kickoff stays hidden",
      title: "This Club Is A joke!",
      description: "Man United v Liverpool on Sunday and the club is in chaos.",
      publishedAt: at("seed-2", -3.5 * 24 * 60),
      clubs: ["fd-66"],
      expectBelowFloor: true,
    },
    {
      // A cup tie we do not track, attached to Chelsea's next league game.
      name: "another club's game is not this fixture's preview",
      title: "Liverpool Knock Chelsea out on Penalties. Terrible performance!!!",
      publishedAt: at("seed-1", -3 * 24 * 60),
      clubs: ["fd-57", "fd-66", "fd-61", "fd-64", "fd-65"],
      expectBelowFloor: true,
    },
    {
      // The rule must still let a real preview through days out.
      name: "a preview naming the opponent days out still counts",
      title: "Our Predicted Line-Up For Liverpool",
      publishedAt: at("seed-2", -2 * 24 * 60),
      clubs: ["fd-66"],
      expectFixture: "seed-2",
      expectPhase: "pre",
    },
    {
      // "Off The Bar" is a show's name: BAR, Barcelona's code, is not a club here.
      name: "a three-letter word is not another club",
      title: "Is Carrick's Job On The Line Against Liverpool?! | Off The Bar",
      publishedAt: at("seed-2", -2 * 24 * 60),
      clubs: ["fd-66"],
      expectFixture: "seed-2",
      expectPhase: "pre",
    },
  ];

  let failures = 0;

  for (const c of cases) {
    const candidates = prefilter(
      { title: c.title, description: c.description ?? "", publishedAt: c.publishedAt },
      c.clubs,
      fixtures,
      teams,
    );

    const best = candidates[0];
    const gotFixture = best?.fixture.id ?? null;
    const gotPhase = best?.phase;
    const score = best?.score ?? 0;

    const okFixture = c.expectFixture === undefined || gotFixture === c.expectFixture;
    const okPhase = !c.expectPhase || gotPhase === c.expectPhase;
    const okFloor = !c.expectBelowFloor || score < TAG_MIN_CONFIDENCE;
    const ok = okFixture && okPhase && okFloor;
    if (!ok) failures += 1;

    const margin = candidates.length > 1 ? (best.score - candidates[1].score).toFixed(2) : "n/a";

    const shown = score >= TAG_MIN_CONFIDENCE ? "SHOWN " : "hidden";
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${c.name}\n` +
        `      → ${gotFixture ?? "none"} ${gotPhase ?? ""} ` +
        `score=${score.toFixed(2)} ${shown} margin=${margin}` +
        (best ? `\n      reasons: ${best.reasons.join(", ")}` : ""),
    );
  }

  console.log(`\n${cases.length - failures}/${cases.length} passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
