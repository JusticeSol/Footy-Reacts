/**
 * YouTube ingestion.
 *
 * Quota note — this is the decision the whole pipeline rests on:
 *   search.list       = 100 units per call
 *   playlistItems.list=   1 unit per call
 * Every creator has an "uploads" playlist, so polling that playlist costs 1
 * unit per creator per poll. At 20 creators polled every 15 minutes that is
 * ~1,920 units/day against a 10,000/day default quota. Using search would be
 * 192,000 and die on day one.
 */

const API = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideo {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl?: string;
  durationSec?: number;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  return key;
}

async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube ${endpoint} ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * Channel id → uploads playlist id. Costs 1 unit and never changes, so the
 * result is persisted on the creator record and this is called once per creator.
 */
export async function resolveUploadsPlaylistId(channelId: string): Promise<string | null> {
  const body = await call<{
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
  }>("channels", { part: "contentDetails", id: channelId });

  return body.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

/** Accepts a @handle and returns the channel id (1 unit). */
export async function resolveChannelIdFromHandle(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, "");
  const body = await call<{ items?: Array<{ id?: string }> }>("channels", {
    part: "id",
    forHandle: `@${clean}`,
  });
  return body.items?.[0]?.id ?? null;
}

interface PlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      publishedAt?: string;
      channelId?: string;
      title?: string;
      description?: string;
      thumbnails?: Record<string, { url?: string }>;
      resourceId?: { videoId?: string };
    };
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
  }>;
}

/**
 * Recent uploads for one creator, newest first, limited to videos published
 * after `since` (the poller passes the last successful run time).
 */
export async function fetchRecentUploads(
  uploadsPlaylistId: string,
  opts: { since?: Date; maxResults?: number } = {},
): Promise<YouTubeVideo[]> {
  const { since, maxResults = 15 } = opts;

  const body = await call<PlaylistItemsResponse>("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(Math.min(maxResults, 50)),
  });

  const videos: YouTubeVideo[] = [];
  for (const item of body.items ?? []) {
    const s = item.snippet;
    const videoId = item.contentDetails?.videoId ?? s?.resourceId?.videoId;
    const publishedAt = item.contentDetails?.videoPublishedAt ?? s?.publishedAt;
    if (!videoId || !publishedAt || !s) continue;
    if (since && Date.parse(publishedAt) <= since.getTime()) continue;

    const thumbs = s.thumbnails ?? {};
    videos.push({
      videoId,
      channelId: s.channelId ?? "",
      title: s.title ?? "",
      description: s.description ?? "",
      publishedAt,
      thumbnailUrl:
        thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url,
    });
  }

  return videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** ISO-8601 duration ("PT12M34S") → seconds. */
export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Durations for up to 50 videos in one call (1 unit). Used to drop Shorts and
 * to show runtime on the take card.
 */
export async function fetchDurations(videoIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const body = await call<{
      items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
    }>("videos", { part: "contentDetails", id: batch.join(",") });

    for (const item of body.items ?? []) {
      if (item.id && item.contentDetails?.duration) {
        out.set(item.id, parseDuration(item.contentDetails.duration));
      }
    }
  }
  return out;
}

/**
 * Title, description and publish time for up to 50 videos per call (1 unit).
 *
 * Used when re-scoring stored takes: the take row keeps the title but not the
 * description, and the tagger reads both — re-scoring without the description
 * would quietly drop takes that were matched on it.
 */
export async function fetchSnippets(
  videoIds: string[],
): Promise<Map<string, { title: string; description: string; publishedAt: string }>> {
  const out = new Map<string, { title: string; description: string; publishedAt: string }>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const body = await call<{
      items?: Array<{
        id?: string;
        snippet?: { title?: string; description?: string; publishedAt?: string };
      }>;
    }>("videos", { part: "snippet", id: batch.join(",") });

    for (const item of body.items ?? []) {
      if (!item.id || !item.snippet) continue;
      out.set(item.id, {
        title: item.snippet.title ?? "",
        description: item.snippet.description ?? "",
        publishedAt: item.snippet.publishedAt ?? new Date().toISOString(),
      });
    }
  }

  return out;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string): string {
  // No autoplay, no related videos from other channels — we are adding views to
  // the creator, not routing them away.
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}
