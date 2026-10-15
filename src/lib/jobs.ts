import { getRepo } from "./repo";
import { syncFixtures } from "./providers/fixtures";
import {
  fetchDurations,
  fetchPlayability,
  fetchRecentUploads,
  resolveChannelIdFromHandle,
  resolveUploadsPlaylistId,
  youtubeWatchUrl,
} from "./providers/youtube";
import { tagVideo } from "./tagger";
import { matchHighlight } from "./highlights/match";
import { HIGHLIGHT_SOURCES, uploadsPlaylistFor } from "./highlights/sources";
import type { Highlight, Take, Team } from "./types";

/**
 * The two cron jobs. Both are idempotent: safe to run every 15 minutes, safe
 * to run twice, and neither ever overwrites a manual correction.
 *
 * They talk to the repo interface, so the same code runs against the local
 * JSON file and against Supabase.
 */

export interface FixturesJobResult {
  store: string;
  teamsUpserted: number;
  fixturesUpserted: number;
}

export async function runFixturesSync(
  opts: { daysBack?: number; daysAhead?: number } = {},
): Promise<FixturesJobResult> {
  const repo = getRepo();
  const { teams, fixtures } = await syncFixtures(opts);

  await repo.upsertTeams(teams);
  await repo.upsertFixtures(fixtures);

  return {
    store: repo.kind,
    teamsUpserted: teams.length,
    fixturesUpserted: fixtures.length,
  };
}

export interface TakesJobResult {
  store: string;
  creatorsPolled: number;
  videosSeen: number;
  takesAdded: number;
  unmatched: number;
  skipped: string[];
}

/** Videos shorter than this are Shorts and clips, not takes. */
const MIN_DURATION_SEC = 90;

export async function runTakesSync(opts: { sinceHours?: number } = {}): Promise<TakesJobResult> {
  const { sinceHours = 48 } = opts;
  const since = new Date(Date.now() - sinceHours * 3_600_000);
  const repo = getRepo();

  const [teamList, fixtures, creators, existing] = await Promise.all([
    repo.listTeams(),
    repo.listFixtures(),
    repo.listCreators(),
    repo.listTakeKeys(),
  ]);
  const teams = new Map<string, Team>(teamList.map((t) => [t.id, t]));

  const result: TakesJobResult = {
    store: repo.kind,
    creatorsPolled: 0,
    videosSeen: 0,
    takesAdded: 0,
    unmatched: 0,
    skipped: [],
  };

  const newTakes: Take[] = [];

  for (const creator of creators) {
    let channelId = creator.youtubeChannelId;
    let playlistId = creator.uploadsPlaylistId;

    try {
      if (!playlistId) {
        if (!channelId) {
          channelId = (await resolveChannelIdFromHandle(creator.handle)) ?? undefined;
          if (!channelId) {
            result.skipped.push(`${creator.name}: handle ${creator.handle} did not resolve`);
            continue;
          }
        }
        playlistId = (await resolveUploadsPlaylistId(channelId)) ?? undefined;
        if (!playlistId) {
          result.skipped.push(`${creator.name}: no uploads playlist`);
          continue;
        }
        // Cache it: this pair never changes, and re-resolving costs quota.
        await repo.setCreatorYouTube(creator.id, channelId, playlistId);
      }

      const videos = await fetchRecentUploads(playlistId, { since });
      result.creatorsPolled += 1;
      result.videosSeen += videos.length;

      const fresh = videos.filter((v) => !existing.has(`youtube:${v.videoId}`));
      if (fresh.length === 0) continue;

      const durations = await fetchDurations(fresh.map((v) => v.videoId));

      for (const video of fresh) {
        const durationSec = durations.get(video.videoId);
        if (durationSec !== undefined && durationSec < MIN_DURATION_SEC) continue;

        const tag = await tagVideo(video, creator.clubAffinity, fixtures, teams);
        if (!tag.fixtureId) {
          result.unmatched += 1;
          continue;
        }

        newTakes.push({
          id: `yt-${video.videoId}`,
          fixtureId: tag.fixtureId,
          creatorId: creator.id,
          phase: tag.phase,
          source: "youtube",
          externalId: video.videoId,
          title: video.title,
          url: youtubeWatchUrl(video.videoId),
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          durationSec,
          confidence: tag.confidence,
          taggedBy: tag.taggedBy,
        });
        existing.add(`youtube:${video.videoId}`);
        result.takesAdded += 1;
      }
    } catch (err) {
      result.skipped.push(`${creator.name}: ${(err as Error).message}`);
    }
  }

  await repo.upsertTakes(newTakes);
  return result;
}

export interface HighlightsJobResult {
  store: string;
  sourcesPolled: number;
  videosSeen: number;
  highlightsAdded: number;
  rejected: number;
  skipped: string[];
}

/**
 * Polls every official channel in HIGHLIGHT_SOURCES and stores the Premier
 * League highlights among their new uploads. Idempotent like the take sync:
 * a video already stored is never looked at again.
 *
 * Costs 1 quota unit per source per run (one page of its uploads playlist),
 * plus 1 for the batch of new candidates' embedding and region rules.
 */
export async function runHighlightsSync(opts: { sinceHours?: number } = {}): Promise<HighlightsJobResult> {
  const { sinceHours = 48 } = opts;
  const since = new Date(Date.now() - sinceHours * 3_600_000);
  const repo = getRepo();

  const [teams, fixtures, existing] = await Promise.all([
    repo.listTeams(),
    repo.listFixtures(),
    repo.listHighlightVideoIds(),
  ]);

  const result: HighlightsJobResult = {
    store: repo.kind,
    sourcesPolled: 0,
    videosSeen: 0,
    highlightsAdded: 0,
    rejected: 0,
    skipped: [],
  };

  const found: Array<Omit<Highlight, "embeddable" | "durationSec" | "regionsAllowed" | "regionsBlocked">> = [];

  for (const source of HIGHLIGHT_SOURCES) {
    try {
      // Up to 3 pages: NBC posts ~11 videos a day across every sport, so one page
      // of 50 reaches back only ~4 days. Paging stops at the cutoff, so a normal
      // run still costs 1 unit per source.
      const videos = await fetchRecentUploads(uploadsPlaylistFor(source), { since, maxPages: 3 });
      result.sourcesPolled += 1;
      result.videosSeen += videos.length;

      for (const video of videos) {
        if (existing.has(video.videoId)) continue;
        const match = matchHighlight(video, source, fixtures, teams);
        if (match.kind === "reject") {
          result.rejected += 1;
          continue;
        }
        found.push({
          id: `yt-${video.videoId}`,
          kind: match.kind,
          fixtureId: match.kind === "match" ? match.fixtureId : undefined,
          matchday: match.kind === "matchday" ? match.matchday : undefined,
          sourceId: source.id,
          videoId: video.videoId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          extended: match.kind === "match" ? match.extended : false,
        });
        existing.add(video.videoId);
      }
    } catch (err) {
      result.skipped.push(`${source.name}: ${(err as Error).message}`);
    }
  }

  // Embedding and region rules decide what each visitor can be shown.
  const rules = await fetchPlayability(found.map((h) => h.videoId));
  const highlights: Highlight[] = found.map((h) => {
    const r = rules.get(h.videoId);
    return {
      ...h,
      embeddable: r?.embeddable ?? false,
      durationSec: r?.durationSec,
      regionsAllowed: r?.regionsAllowed,
      regionsBlocked: r?.regionsBlocked,
    };
  });

  await repo.upsertHighlights(highlights);
  result.highlightsAdded = highlights.length;
  return result;
}
