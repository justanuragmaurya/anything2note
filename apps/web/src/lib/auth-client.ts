import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [emailOTPClient()],
});

/** The signed-in user; only rendered inside AppShell, which waits for a session. */
export function useCurrentUser() {
  const { data } = authClient.useSession();
  const user = data?.user;
  const fullName = user?.name ?? "";
  return {
    fullName,
    firstName: fullName.split(" ")[0] ?? "",
    email: user?.email ?? "",
    image: user?.image ?? null,
  };
}
