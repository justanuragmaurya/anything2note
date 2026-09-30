import { Redirect } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { usePreferences } from "@/lib/preferences";
import { useIncoming } from "@/lib/share";

/**
 * Entry: first launch → onboarding → sign-in → Library. Signed-in users go straight to Library,
 * or to the share screen when something was shared in before they signed in.
 */
export default function Index() {
  const { data: session } = authClient.useSession();
  const { onboarded } = usePreferences();
  const incoming = useIncoming();
  if (session) return <Redirect href={incoming ? "/share" : "/library"} />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/sign-in" />;
}
