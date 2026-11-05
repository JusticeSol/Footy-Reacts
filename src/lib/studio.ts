import type { HydratedFixture, HydratedTake, Team } from "./types";

/**
 * The daily post pack behind /studio: ready-to-edit drafts for the Footy
 * Reacts X account, built from what the creators posted in the last two days.
 *
 * Captions follow the account's own house style: one short line naming the
 * creator and the match or story, posted with a clip of them ("Dani of
 * Football Fans Tribe after Chelsea's 5-1 comprehensive win over
 * Bournemouth."). Pure functions, so the page and any script agree.
 */

export interface Draft {
  id: string;
  kind: "post" | "pre" | "numbers" | "talk";
  text: string;
  /** Where the clip comes from: the creator's video. */
  videoUrl?: string;
  creator?: string;
  /** The Footy Reacts page the post can link to. */
  pageUrl?: string;
  note?: string;
}

export interface PostPack {
  day: number;
  streakLength: number;
  drafts: Draft[];
}

type Recent = { take: HydratedTake; fixture: HydratedFixture };

const STREAK_START = "2026-11-06";
const STREAK_LENGTH = 30;
const WINDOW_MS = 48 * 3_600_000;
const DAY_MS = 86_400_000;

const londonDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });
const londonWeekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" });

/** Day 1 is the streak's first day, in London time. */
export function streakDay(now: number): number {
  const today = Date.parse(londonDay.format(new Date(now)));
  return Math.floor((today - Date.parse(STREAK_START)) / DAY_MS) + 1;
}

/** "Chelsea's 5-1 win over Bournemouth", told from the creator's side when we know it. */
export function resultPhrase(fixture: HydratedFixture, creatorClubs: string[]): string {
  const { homeTeam: home, awayTeam: away, score } = fixture;
  if (!score) return `${home.shortName} v ${away.shortName}`;
  if (score.home === score.away) {
    const side = creatorClubs.includes(away.id) ? away : home;
    const other = side === home ? away : home;
    return `${side.shortName}'s ${score.home}-${score.away} draw with ${other.shortName}`;
  }
  const [winner, loser, w, l]: [Team, Team, number, number] =
    score.home > score.away
      ? [home, away, score.home, score.away]
      : [away, home, score.away, score.home];
  if (creatorClubs.includes(loser.id) && !creatorClubs.includes(winner.id)) {
    return `${loser.shortName}'s ${w}-${l} defeat to ${winner.shortName}`;
  }
  return `${winner.shortName}'s ${w}-${l} win over ${loser.shortName}`;
}

/** A video title as a quote: the headline before any "|", without hashtags. */
export function quoteFromTitle(title: string): string {
  const head = title.split("|")[0].replace(/#\S+/g, "").replace(/\s+/g, " ").trim();
  const clipped = head.length > 110 ? `${head.slice(0, 107).trimEnd()}...` : head;
  return clipped.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
}

function whenPhrase(kickoffIso: string, now: number): string {
  const kickoffDay = londonDay.format(new Date(kickoffIso));
  if (kickoffDay === londonDay.format(new Date(now))) return "tonight";
  if (kickoffDay === londonDay.format(new Date(now + DAY_MS))) return "tomorrow";
  return `on ${londonWeekday.format(new Date(kickoffIso))}`;
}

/**
 * One take per creator, newest first, dealt across fixtures: every game gets
 * its first draft before any game gets a second.
 */
function onePerCreator(rows: Recent[]): Recent[] {
  const seen = new Set<string>();
  const firsts = rows.filter(({ take }) => !seen.has(take.creatorId) && seen.add(take.creatorId));
  const byFixture = new Map<string, Recent[]>();
  for (const row of firsts) {
    const list = byFixture.get(row.fixture.id) ?? [];
    list.push(row);
    byFixture.set(row.fixture.id, list);
  }
  const queues = [...byFixture.values()];
  const dealt: Recent[] = [];
  for (let i = 0; dealt.length < firsts.length; i++) {
    for (const q of queues) if (q[i]) dealt.push(q[i]);
  }
  return dealt;
}

// Words that crowd fan-channel titles without being a story.
const NOT_A_STORY = new Set(
  (
    "live reaction reactions react reacts review preview match matchday fans fan news " +
    "watch along watchalong highlights goals goal player ratings ratings starting lineup " +
    "this that what when where why how after before with from they their them have " +
    "just must best worst huge shock shocking breaking official update exclusive " +
    "premier league champions football club united city season game games win wins " +
    "loss lose draw today tonight tomorrow week weekend final first last again only " +
    "about against into will would could should never every still back time over " +
    "talking points press conference podcast show episode part full vlog stadium " +
    "manager players player team squad transfer done deal really need more than"
  ).split(" "),
);

/** "Fenerbahçe" and "Fenerbahce" are one word. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function teamWords(teams: Team[]): Set<string> {
  const words = new Set<string>();
  for (const t of teams) {
    for (const w of fold(`${t.name} ${t.shortName}`).split(/[^a-z]+/)) {
      if (w.length >= 3) words.add(w);
    }
  }
  return words;
}

/**
 * Names several channels are talking about at once: the day's story as the
 * fan channels see it. A word counts once per creator, so one channel's upload
 * spree cannot make a trend.
 */
export function talkingPoints(rows: Recent[], minCreators = 3): Array<{ word: string; rows: Recent[] }> {
  const teams = teamWords(rows.flatMap(({ fixture }) => [fixture.homeTeam, fixture.awayTeam]));
  const byWord = new Map<string, { display: string; creators: Set<string>; rows: Recent[] }>();

  for (const row of rows) {
    const words = new Set(
      (row.take.title.match(/[A-Za-zÀ-ÿ']{4,}/g) ?? []).filter((w) => /^[A-ZÀ-Þ]/.test(w)),
    );
    for (const raw of words) {
      const word = raw.replace(/'s$/i, "");
      const key = fold(word);
      if (NOT_A_STORY.has(key) || teams.has(key)) continue;
      const entry = byWord.get(key) ?? { display: word, creators: new Set(), rows: [] };
      if (!entry.creators.has(row.take.creatorId)) entry.rows.push(row);
      entry.creators.add(row.take.creatorId);
      byWord.set(key, entry);
    }
  }

  return [...byWord.values()]
    .filter((e) => e.creators.size >= minCreators)
    .sort((a, b) => b.creators.size - a.creators.size)
    .slice(0, 3)
    .map((e) => ({
      word: e.display.charAt(0).toUpperCase() + e.display.slice(1).toLowerCase(),
      rows: e.rows,
    }));
}

export function buildPostPack(recent: Recent[], siteUrl: string, now: number = Date.now()): PostPack {
  const rows = recent.filter(({ take }) => now - Date.parse(take.publishedAt) <= WINDOW_MS);
  const page = (f: HydratedFixture, phase?: "pre" | "post") =>
    `${siteUrl}/match/${f.slug}${phase ? `?phase=${phase}` : ""}`;
  const drafts: Draft[] = [];

  // After the whistle: the newest reaction per creator on games just played.
  const post = onePerCreator(rows.filter(({ take, fixture }) => take.phase === "post" && fixture.score));
  for (const { take, fixture } of post.slice(0, 4)) {
    const phrase = resultPhrase(fixture, take.creator.clubAffinity);
    drafts.push({
      id: `post-${take.id}`,
      kind: "post",
      text: `${take.creator.name} after ${phrase} 👀`,
      videoUrl: take.url,
      creator: take.creator.name,
      pageUrl: page(fixture, "post"),
      note: `Their video: "${quoteFromTitle(take.title)}". Add the presenter's first name if you know it.`,
    });
  }

  // Before kickoff: previews for games still to come.
  const pre = onePerCreator(
    rows.filter(({ take, fixture }) => take.phase === "pre" && Date.parse(fixture.kickoffUtc) > now),
  );
  for (const { take, fixture } of pre.slice(0, 3)) {
    drafts.push({
      id: `pre-${take.id}`,
      kind: "pre",
      text:
        `"${quoteFromTitle(take.title)}"\n\n` +
        `${take.creator.name} ahead of ${fixture.homeTeam.shortName} v ${fixture.awayTeam.shortName} ` +
        `${whenPhrase(fixture.kickoffUtc, now)} 👀`,
      videoUrl: take.url,
      creator: take.creator.name,
      pageUrl: page(fixture, "pre"),
    });
  }

  // The story of the day, as the fan channels see it.
  for (const { word, rows: about } of talkingPoints(rows)) {
    const channels = about.map((r) => r.take.creator.name);
    drafts.push({
      id: `talk-${word}`,
      kind: "talk",
      text:
        `${word} is all the fan channels are talking about today. ` +
        `${channels.length} channels, one topic 👀\n\nWho's got it right?`,
      videoUrl: about[0].take.url,
      pageUrl: page(about[0].fixture),
      note: `Channels: ${channels.slice(0, 5).join(", ")}. Clip the best line from one of them.`,
    });
  }

  // A number only Footy Reacts has: the most-reacted recent game. The fixture's
  // own counts, since the rows are a thinned sample.
  const fixtures = new Map(rows.map(({ fixture }) => [fixture.id, fixture]));
  const total = (f: HydratedFixture) => f.counts.pre + f.counts.post;
  const top = [...fixtures.values()].sort((a, b) => total(b) - total(a))[0];
  if (top && total(top) >= 5) {
    const fixture = top;
    const name = fixture.score
      ? `${fixture.homeTeam.shortName} ${fixture.score.home}-${fixture.score.away} ${fixture.awayTeam.shortName}`
      : `${fixture.homeTeam.shortName} v ${fixture.awayTeam.shortName}`;
    drafts.push({
      id: `numbers-${fixture.id}`,
      kind: "numbers",
      text:
        `${total(fixture)} fan reactions, before and after.\n\n` +
        `${name} is the game everyone's talking about 🔥\n\nEvery take, one page 👇\n${page(fixture)}`,
      pageUrl: page(fixture),
      note: "This one carries the link. Keep the others link-free so X shows them to more people.",
    });
  }

  return { day: streakDay(now), streakLength: STREAK_LENGTH, drafts };
}
