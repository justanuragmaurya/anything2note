import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) throw new Error("EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to .env.");

/** Better Auth against apps/api (`/api/auth/*`). Cookies and the cached session live in SecureStore. */
export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: "anything2note",
      storagePrefix: "anything2note",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
