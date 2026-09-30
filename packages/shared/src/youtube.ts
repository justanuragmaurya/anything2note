/** YouTube link handling shared by the API and both apps. */

const HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;
const ID = /^[\w-]{11}$/;

/** Whether a link points at YouTube at all (a video or not). */
export function isYoutubeUrl(input: string): boolean {
  try {
    return HOSTS.test(new URL(input.trim()).hostname);
  } catch {
    return false;
  }
}

/**
 * The 11-character video ID from any common link shape: watch?v=, youtu.be/, /shorts/, /live/,
 * /embed/, /v/, m. and music. hosts. Null for channels, playlists and anything else.
 */
export function youtubeIdOf(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!HOSTS.test(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const id = url.hostname.toLowerCase().endsWith("youtu.be")
    ? parts[0]
    : url.searchParams.get("v") ?? (["shorts", "live", "embed", "v"].includes(parts[0] ?? "") ? parts[1] : undefined);
  return id && ID.test(id) ? id : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
