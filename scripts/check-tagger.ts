import { loadDb } from "../src/lib/store";
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
  expectFixture: string | null;
  expectPhase?: "pre" | "post";
}

async function main() {
  const db = await loadDb();
  const teams = new Map(db.teams.map((t) => [t.id, t]));
  const byId = new Map(db.fixtures.map((f) => [f.id, f]));

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
  ];

  let failures = 0;

  for (const c of cases) {
    const candidates = prefilter(
      { title: c.title, description: c.description ?? "", publishedAt: c.publishedAt },
      c.clubs,
      db.fixtures,
      teams,
    );

    const best = candidates[0];
    const gotFixture = best?.fixture.id ?? null;
    const gotPhase = best?.phase;
    const ok = gotFixture === c.expectFixture && (!c.expectPhase || gotPhase === c.expectPhase);
    if (!ok) failures += 1;

    const margin = candidates.length > 1 ? (best.score - candidates[1].score).toFixed(2) : "n/a";

    console.log(
      `${ok ? "PASS" : "FAIL"}  ${c.name}\n` +
        `      → ${gotFixture ?? "none"} ${gotPhase ?? ""} ` +
        `score=${best?.score.toFixed(2) ?? "0.00"} margin=${margin}` +
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
