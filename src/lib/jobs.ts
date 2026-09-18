import { loadDb, mutate } from "./store";
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
 * to run twice, and neither ever deletes a manual correction.
 */

export interface FixturesJobResult {
  teamsUpserted: number;
  fixturesUpserted: number;
}

export async function runFixturesSync(): Promise<FixturesJobResult> {
  const { teams, fixtures } = await syncFixtures();

  await mutate((db) => {
    for (const team of teams) {
      const i = db.teams.findIndex((t) => t.id === team.id);
      if (i === -1) db.teams.push(team);
      else db.teams[i] = { ...db.teams[i], ...team };
    }

    for (const fixture of fixtures) {
      const i = db.fixtures.findIndex((f) => f.id === fixture.id || f.slug === fixture.slug);
      if (i === -1) db.fixtures.push(fixture);
      // Kickoffs move and scores arrive — the provider is authoritative for
      // both, but we keep our own id so existing takes stay attached.
      else db.fixtures[i] = { ...db.fixtures[i], ...fixture, id: db.fixtures[i].id };
    }
  });

  return { teamsUpserted: teams.length, fixturesUpserted: fixtures.length };
}

export interface TakesJobResult {
  creatorsPolled: number;
  videosSeen: number;
  takesAdded: number;
  unmatched: number;
  skipped: string[];
}

/** Videos shorter than this are Shorts/clips, not takes. */
const MIN_DURATION_SEC = 90;

export async function runTakesSync(
  opts: { sinceHours?: number } = {},
): Promise<TakesJobResult> {
  const { sinceHours = 48 } = opts;
  const since = new Date(Date.now() - sinceHours * 3_600_000);

  const db = await loadDb();
  const teams = new Map<string, Team>(db.teams.map((t) => [t.id, t]));
  const existing = new Set(db.takes.map((t) => `${t.source}:${t.externalId}`));

  const result: TakesJobResult = {
    creatorsPolled: 0,
    videosSeen: 0,
    takesAdded: 0,
    unmatched: 0,
    skipped: [],
  };

  const newTakes: Take[] = [];
  // Resolutions discovered during this run, persisted at the end.
  const resolved: Array<{ id: string; channelId?: string; playlistId?: string }> = [];

  for (const creator of db.creators) {
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
        resolved.push({ id: creator.id, channelId, playlistId });
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

        const tag = await tagVideo(video, creator.clubAffinity, db.fixtures, teams);
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

  if (newTakes.length > 0 || resolved.length > 0) {
    await mutate((db) => {
      for (const r of resolved) {
        const creator = db.creators.find((c) => c.id === r.id);
        if (!creator) continue;
        creator.youtubeChannelId = r.channelId;
        creator.uploadsPlaylistId = r.playlistId;
      }
      for (const take of newTakes) {
        // A manual correction always wins over a re-tag.
        const i = db.takes.findIndex((t) => t.id === take.id);
        if (i === -1) db.takes.push(take);
        else if (db.takes[i].taggedBy !== "manual") db.takes[i] = { ...db.takes[i], ...take };
      }
    });
  }

  return result;
}
