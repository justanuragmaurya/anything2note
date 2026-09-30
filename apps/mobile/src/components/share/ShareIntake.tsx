import { useEffect } from "react";
import { router, usePathname } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { fromShareIntent, setIncoming } from "@/lib/share";

/**
 * Takes content shared from another app off expo-share-intent as soon as it arrives and opens the
 * share screen. Signed out, it waits in `lib/share` and the entry route opens the share screen
 * after sign-in. Renders nothing.
 */
export function ShareIntake({ signedIn }: { signedIn: boolean }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasShareIntent) return;
    const incoming = fromShareIntent(shareIntent);
    // Clear the native copy so returning to the app doesn't deliver the same share again.
    resetShareIntent();
    if (!incoming) return;
    setIncoming(incoming);
    // On iOS the share link already routed to /share (see +native-intent).
    if (signedIn && pathname !== "/share") router.push("/share");
    // Only a new share should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);

  return null;
}
