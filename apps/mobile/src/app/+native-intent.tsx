import { getShareExtensionKey } from "expo-share-intent";

/**
 * The iOS share extension opens the app with `anything2note://dataUrl=anything2noteShareKey#…`,
 * which isn't a route: send it to the share screen, which picks the shared content up from
 * expo-share-intent. Every other link is left alone.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/share";
    return path;
  } catch {
    return "/";
  }
}
