import type { Fixture, Phase, Team } from "./types";
import type { YouTubeVideo } from "./providers/youtube";

/**
 * Fixture tagging: which match is this video about, and is it a pre- or
 * post-match take?
 *
 * Two stages, deliberately:
 *   1. A deterministic pre-filter narrows the whole calendar down to 2–3
 *      plausible fixtures using team-name hits, the creator's club affinity
 *      and time proximity to kickoff. Free, and it does most of the work.
 *   2. Only if the top two candidates are close does Claude choose between
 *      them. Picking one of three labelled options is a much easier (and
 *      cheaper) task than guessing a fixture from an open calendar.
 *
 * With no ANTHROPIC_API_KEY the heuristic decides alone — the pipeline never
 * hard-depends on the model.
 */

/** Nicknames and shorthand the crests and API names never contain. */
const ALIASES: Record<string, string[]> = {
  arsenal: ["arsenal", "gunners", "afc", "ars"],
  chelsea: ["chelsea", "blues", "cfc"],
  liverpool: ["liverpool", "lfc", "reds"],
  "manchester city": ["man city", "mancity", "city", "mcfc", "citizens"],
  "manchester united": ["man utd", "man united", "manutd", "united", "mufc", "red devils"],
  tottenham: ["tottenham", "spurs", "thfc"],
  "newcastle united": ["newcastle", "nufc", "magpies", "toon"],
  "aston villa": ["villa", "avfc"],
  "west ham united": ["west ham", "whufc", "hammers", "irons"],
  everton: ["everton", "efc", "toffees"],
  "wolverhampton wanderers": ["wolves", "wwfc"],
  "brighton hove albion": ["brighton", "bhafc", "seagulls"],
  "nottingham forest": ["forest", "nffc"],
  "crystal palace": ["palace", "cpfc", "eagles"],
  fulham: ["fulham", "ffc", "cottagers"],
  brentford: ["brentford", "bees"],
  bournemouth: ["bournemouth", "afcb", "cherries"],
  "leeds united": ["leeds", "lufc", "whites"],
  sunderland: ["sunderland", "safc", "black cats"],
  burnley: ["burnley", "clarets"],
};

/**
 * Markers of football that is not the club fixture we track. A creator who
 * covers five clubs posts plenty of this, and it otherwise scores just high
 * enough on affinity and timing alone to be published.
 *
 * Matched against the title only — a passing mention in a description should
 * not condemn a genuine match reaction.
 */
const OFF_TOPIC_WORDS = [
  "u17",
  "u18",
  "u20",
  "u21",
  "u23",
  "world cup",
  "afcon",
  "olympic",
  "international break",
  "transfer window",
  "deadline day",
  // National-team content: squad announcements and friendlies are not club
  // match reactions, whichever country the channel follows.
  "call up",
  "squad announcement",
  "friendly",
];

const PRE_WORDS = [
  "preview",
  "prediction",
  "predictions",
  "team news",
  "build up",
  "buildup",
  "line up",
  "lineup",
  "starting xi",
  "pre match",
  "pre-match",
  "preview show",
  "ahead of",
];

const POST_WORDS = [
  "reaction",
  "reacts",
  "react",
  "review",
  "post match",
  "post-match",
  "full time",
  "fulltime",
  // Not "ft": on YouTube it means "featuring" far more often than full time,
  // so a guest credit list read as match content.
  "player ratings",
  "ratings",
  "rant",
  "highlights",
  "analysis",
  "verdict",
  "instant",
];

/** Typical window a match occupies, kickoff → final whistle. */
const MATCH_DURATION_MS = 115 * 60_000;
/** How far before kickoff a video can still be a preview of it. */
const PRE_WINDOW_MS = 4 * 86_400_000;
/** How long after the whistle a video can still be a reaction to it. */
const POST_WINDOW_MS = 3 * 86_400_000;

export interface TagCandidate {
  fixture: Fixture;
  phase: Phase;
  score: number;
  reasons: string[];
}

export interface TagResult {
  fixtureId: string | null;
  phase: Phase;
  confidence: number;
  taggedBy: "heuristic" | "agent";
  reason: string;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasesFor(team: Team): string[] {
  const key = normalise(team.name).replace(/\b(fc|afc|cf|sc)\b/g, "").trim();
  const known = ALIASES[key];
  const base = [
    normalise(team.shortName),
    normalise(team.name).replace(/\b(fc|afc)\b/g, "").trim(),
    // Creators write board abbreviations too: "LIV v MAN UTD".
    normalise(team.abbr),
  ];
  return [...new Set([...(known ?? []), ...base].filter((a) => a.length >= 3))];
}

/** Whole-word only. Substring matching is what made "preview" contain "review". */
function containsWord(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
}

function mentions(haystack: string, team: Team): boolean {
  return aliasesFor(team).some((alias) => containsWord(haystack, alias));
}

function phaseFromText(text: string): { phase: Phase | null; hit: string | null } {
  for (const w of POST_WORDS) if (containsWord(text, w)) return { phase: "post", hit: w };
  for (const w of PRE_WORDS) if (containsWord(text, w)) return { phase: "pre", hit: w };
  return { phase: null, hit: null };
}

/**
 * Stage 1 — narrow the calendar to the few fixtures worth considering.
 * Exported so the sync script can log what the model was choosing between.
 */
export function prefilter(
  video: Pick<YouTubeVideo, "title" | "description" | "publishedAt">,
  creatorClubIds: string[],
  fixtures: Fixture[],
  teams: Map<string, Team>,
  limit = 3,
): TagCandidate[] {
  const title = normalise(video.title);
  const blurb = normalise(video.description.slice(0, 400));
  const haystack = `${title} ${blurb}`;
  const published = Date.parse(video.publishedAt);
  const textPhase = phaseFromText(`${title} ${blurb}`);

  const candidates: TagCandidate[] = [];

  for (const fixture of fixtures) {
    const kickoff = Date.parse(fixture.kickoffUtc);
    const whistle = kickoff + MATCH_DURATION_MS;

    // Outside the plausible window this fixture cannot be the subject.
    if (published < kickoff - PRE_WINDOW_MS) continue;
    if (published > whistle + POST_WINDOW_MS) continue;

    const home = teams.get(fixture.homeTeamId);
    const away = teams.get(fixture.awayTeamId);
    if (!home || !away) continue;

    const reasons: string[] = [];
    let score = 0;

    const homeHit = mentions(haystack, home);
    const awayHit = mentions(haystack, away);
    const homeInTitle = mentions(title, home);
    const awayInTitle = mentions(title, away);

    if (homeHit && awayHit) {
      score += 0.5;
      reasons.push("both teams named");
      if (homeInTitle && awayInTitle) {
        score += 0.15;
        reasons.push("both in title");
      }
    } else if (homeHit || awayHit) {
      score += 0.2;
      reasons.push("one team named");
    }

    // A creator who only covers Arsenal is almost certainly talking about the
    // Arsenal game that week, even with a vague title.
    const coversHome = creatorClubIds.includes(fixture.homeTeamId);
    const coversAway = creatorClubIds.includes(fixture.awayTeamId);
    if (coversHome || coversAway) {
      score += 0.25;
      reasons.push("creator's club");
    }

    // Time proximity: closest to the relevant edge of the match wins.
    const isAfter = published > whistle;
    const distanceMs = isAfter ? published - whistle : Math.abs(kickoff - published);
    const windowMs = isAfter ? POST_WINDOW_MS : PRE_WINDOW_MS;
    const proximity = Math.max(0, 1 - distanceMs / windowMs);
    score += proximity * 0.3;
    if (proximity > 0.8) reasons.push("published close to kickoff");

    // Phase: timing decides, wording breaks the tie inside the match window.
    let phase: Phase;
    if (published >= whistle) phase = "post";
    else if (published <= kickoff) phase = "pre";
    else phase = textPhase.phase ?? "pre";

    // Wording that contradicts the timing is a real signal that we matched the
    // wrong fixture (e.g. a "reaction" published before this kickoff).
    if (textPhase.phase && textPhase.phase !== phase) {
      score -= 0.2;
      reasons.push(`wording says ${textPhase.phase}`);
    } else if (textPhase.hit) {
      score += 0.1;
      reasons.push(`"${textPhase.hit}"`);
    }

    // Football that is plainly not this fixture: youth, international or
    // transfer content from a club channel.
    if (OFF_TOPIC_WORDS.some((w) => containsWord(title, w))) {
      score -= 0.25;
      reasons.push("off-topic marker in title");
    }

    // Affinity plus timing alone must never be enough to publish. Without a
    // club named anywhere, or wording that marks it as match content, all we
    // actually know is that this creator posted near a kickoff — which is true
    // of everything they post on a matchday.
    if (!homeHit && !awayHit && !textPhase.hit) {
      score = Math.min(score, 0.4);
      reasons.push("no team or phase signal — capped");
    }

    if (score <= 0) continue;
    candidates.push({ fixture, phase, score: Math.min(score, 1), reasons });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

// --- Stage 2: Claude as tie-breaker ----------------------------------------

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

async function askClaude(
  video: Pick<YouTubeVideo, "title" | "description" | "publishedAt">,
  candidates: TagCandidate[],
  teams: Map<string, Team>,
): Promise<TagResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const options = candidates
    .map((c, i) => {
      const home = teams.get(c.fixture.homeTeamId)?.shortName ?? "?";
      const away = teams.get(c.fixture.awayTeamId)?.shortName ?? "?";
      return `${i + 1}. ${home} vs ${away} — kickoff ${c.fixture.kickoffUtc} (id: ${c.fixture.id})`;
    })
    .join("\n");

  const prompt = `A football creator published this video:

TITLE: ${video.title}
PUBLISHED: ${video.publishedAt}
DESCRIPTION: ${video.description.slice(0, 600)}

Which of these fixtures is it about?

${options}
${candidates.length + 1}. None of these

Answer with JSON only: {"choice": <number>, "phase": "pre"|"post", "confidence": <0-1>, "reason": "<8 words max>"}
"pre" = published before kickoff (preview, team news, predictions).
"post" = published after the final whistle (reaction, review, ratings).`;

  // An organisation-scoped key must name the workspace to bill against; a
  // workspace-scoped key already implies one and needs no header.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}),
    },
    body: JSON.stringify({
      model: process.env.TAGGER_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    // Include the body: a bare status turns a fixable configuration problem
    // (wrong model id, bad key, no credit) into a silent fallback that looks
    // like the model simply agreeing with the heuristic.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.warn(`[tagger] Claude ${res.status}: ${detail}`);
    return null;
  }

  const body = (await res.json()) as AnthropicResponse;
  const text = body.content?.find((c) => c.type === "text")?.text ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as {
      choice: number;
      phase: Phase;
      confidence: number;
      reason?: string;
    };
    const picked = candidates[parsed.choice - 1];
    if (!picked) {
      return {
        fixtureId: null,
        phase: "post",
        confidence: 0,
        taggedBy: "agent",
        reason: parsed.reason ?? "no matching fixture",
      };
    }
    return {
      fixtureId: picked.fixture.id,
      phase: parsed.phase === "pre" || parsed.phase === "post" ? parsed.phase : picked.phase,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      taggedBy: "agent",
      reason: parsed.reason ?? "model choice",
    };
  } catch {
    return null;
  }
}

/** Margin below which the heuristic is not confident enough to decide alone. */
const AMBIGUITY_MARGIN = 0.15;

export async function tagVideo(
  video: Pick<YouTubeVideo, "title" | "description" | "publishedAt">,
  creatorClubIds: string[],
  fixtures: Fixture[],
  teams: Map<string, Team>,
): Promise<TagResult> {
  const candidates = prefilter(video, creatorClubIds, fixtures, teams);

  if (candidates.length === 0) {
    return {
      fixtureId: null,
      phase: "post",
      confidence: 0,
      taggedBy: "heuristic",
      reason: "no fixture in window",
    };
  }

  const [best, runnerUp] = candidates;
  const clearWinner = !runnerUp || best.score - runnerUp.score >= AMBIGUITY_MARGIN;

  // Only spend a model call when the heuristic is genuinely torn, or when its
  // best guess is weak enough that it would be withheld anyway.
  if (!clearWinner || best.score < 0.7) {
    const agent = await askClaude(video, candidates, teams);
    if (agent) return agent;
  }

  return {
    fixtureId: best.fixture.id,
    phase: best.phase,
    confidence: best.score,
    taggedBy: "heuristic",
    reason: best.reasons.join(", "),
  };
}
