/**
 * Smaller YouTube thumbnails. Images are served as they are (no Vercel
 * optimizer, see next.config.ts), so the file YouTube hands us is the file a
 * phone downloads: the stored URL is usually maxresdefault, ~270 KB.
 *
 * - "card": hqdefault, 480x360, ~26 KB. Exists for every video. It is 4:3
 *   with black bars above and below a 16:9 frame, and the 16:9 boxes these
 *   sit in (object-cover) crop exactly those bars away.
 * - "player": sddefault, 640x480, ~90 KB, for the one big highlight player.
 *   Only swapped in when the stored URL is maxresdefault, which YouTube makes
 *   only for HD uploads, so sddefault exists too.
 *
 * Anything that is not an i.ytimg.com video thumbnail is returned unchanged.
 */
const YT_THUMB = /^(https:\/\/i\.ytimg\.com\/vi\/[^/]+\/)([a-z0-9_]+)\.jpg(\?.*)?$/i;

export function sizedThumbnail(url: string, size: "card" | "player"): string {
  const m = YT_THUMB.exec(url);
  if (!m) return url;
  const [, base, name] = m;
  if (size === "card") return `${base}hqdefault.jpg`;
  return name === "maxresdefault" ? `${base}sddefault.jpg` : url;
}
