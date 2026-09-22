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

/**
 * The channel's own @handle and display title (1 unit).
 *
 * Used when a creator is added by channel id: the handle is shown on every
 * take card, so inventing one from the display name would put a wrong address
 * in front of fans.
 */
export async function fetchChannelProfile(
  channelId: string,
): Promise<{ handle?: string; title?: string; avatarUrl?: string } | null> {
  const body = await call<{
    items?: Array<{
      snippet?: {
        title?: string;
        customUrl?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
    }>;
  }>("channels", { part: "snippet", id: channelId });

  const snippet = body.items?.[0]?.snippet;
  if (!snippet) return null;

  const thumbs = snippet.thumbnails ?? {};
  return {
    handle: snippet.customUrl?.startsWith("@") ? snippet.customUrl : undefined,
    title: snippet.title,
    avatarUrl: thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url,
  };
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
  nextPageToken?: string;
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
 * after `since` (the poller passes the start of its lookback window).
 *
 * Pages until it reaches a video older than `since`. A page of 50 costs the
 * same 1 unit as a page of 5, so the page size is the maximum — and paging
 * matters: a channel posting fifteen reactions on a Sunday would otherwise
 * push Saturday's matches off the end of a single page and they would never
 * be fetched at all.
 */
export async function fetchRecentUploads(
  uploadsPlaylistId: string,
  opts: { since?: Date; maxPages?: number } = {},
): Promise<YouTubeVideo[]> {
  const { since, maxPages = 3 } = opts;

  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;

    const body = await call<PlaylistItemsResponse>("playlistItems", params);
    const items = body.items ?? [];
    if (items.length === 0) break;

    let reachedCutoff = false;

    for (const item of items) {
      const s = item.snippet;
      const videoId = item.contentDetails?.videoId ?? s?.resourceId?.videoId;
      const publishedAt = item.contentDetails?.videoPublishedAt ?? s?.publishedAt;
      if (!videoId || !publishedAt || !s) continue;

      if (since && Date.parse(publishedAt) <= since.getTime()) {
        // Uploads playlists are newest-first, so everything after this is older.
        reachedCutoff = true;
        continue;
      }

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

    pageToken = body.nextPageToken;
    if (reachedCutoff || !pageToken) break;
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
