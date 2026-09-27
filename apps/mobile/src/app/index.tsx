import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

/** Entry: first launch → onboarding → sign-in → Library. */
export default function Index() {
  const { onboarded, email } = useSession();
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!email) return <Redirect href="/sign-in" />;
  return <Redirect href="/library" />;
}
