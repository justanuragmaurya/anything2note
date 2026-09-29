import { Redirect } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { usePreferences } from "@/lib/preferences";

/** Entry: first launch → onboarding → sign-in → Library. Signed-in users go straight to Library. */
export default function Index() {
  const { data: session } = authClient.useSession();
  const { onboarded } = usePreferences();
  if (session) return <Redirect href="/library" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/sign-in" />;
}
