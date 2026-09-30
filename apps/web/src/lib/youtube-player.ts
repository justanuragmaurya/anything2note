/**
 * The YouTube IFrame Player API, loaded once on demand. Only the handful of calls the workspace
 * uses are typed here; see https://developers.google.com/youtube/iframe_api_reference.
 */

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

type YTPlayerOptions = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { target: YTPlayer; data: number }) => void;
    /** 2 bad id, 5 HTML5 error, 100 removed or private, 101/150 embedding disabled */
    onError?: (e: { target: YTPlayer; data: number }) => void;
  };
};

type YTNamespace = { Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer };

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** `onStateChange` values. */
export const YT_STATE = { unstarted: -1, ended: 0, playing: 1, paused: 2, buffering: 3, cued: 5 } as const;

let loading: Promise<YTNamespace> | null = null;

/** Injects https://www.youtube.com/iframe_api the first time; later calls share the same promise. */
export function loadYoutubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      // Let the next mount try again (e.g. after an ad blocker is turned off).
      loading = null;
      script.remove();
      reject(new Error("The YouTube player couldn’t be loaded."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
