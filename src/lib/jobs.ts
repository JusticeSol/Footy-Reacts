import { getRepo } from "./repo";
import { syncFixtures } from "./providers/fixtures";
import {
  fetchDurations,
  fetchRecentUploads,
  resolveChannelIdFromHandle,
  resolveUploadsPlaylistId,
  youtubeWatchUrl,
} from "./providers/youtube";
import { tagVideo } from "./tagger";
import type { Take, Team } from "./types";

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

export async function runFixturesSync(): Promise<FixturesJobResult> {
  const repo = getRepo();
  const { teams, fixtures } = await syncFixtures();

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
