import "../global.css";

import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ShareIntentProvider } from "expo-share-intent";
import { OfflineNotice } from "@/components/offline/OfflineNotice";
import { ShareIntake } from "@/components/share/ShareIntake";
import { authClient } from "@/lib/auth-client";
import { clearLocalData, onCacheRestored, persistOptions } from "@/lib/offline";
import { PreferencesProvider } from "@/lib/preferences";
import { queryClient } from "@/lib/queries";
import { fontAssets } from "@/theme/fonts";
import { palette } from "@/theme";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const { data: session, isPending } = authClient.useSession();
  // `isPending` flips back on while a signed-out session refetches (e.g. on app focus), so only
  // the first answer gates the tree; unmounting the Stack later would reset the sign-in screen.
  const [authReady, setAuthReady] = useState(false);
  const fontsReady = loaded || !!error;
  const signedIn = !!session;
  // A session cached in SecureStore counts as an answer, so returning users skip the wait.
  if (!authReady && (!isPending || signedIn)) setAuthReady(true);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.paper);
  }, []);

  // However the session ended (sign-out, expiry, account deleted), nothing of it stays on the device.
  const wasSignedIn = useRef(signedIn);
  useEffect(() => {
    if (wasSignedIn.current && !signedIn) void clearLocalData();
    wasSignedIn.current = signedIn;
  }, [signedIn]);

  useEffect(() => {
    if (fontsReady && authReady) SplashScreen.hide();
  }, [fontsReady, authReady]);

  // Keep the splash up until the fonts are ready and we know whether someone is signed in.
  if (!fontsReady || !authReady) return null;

  return (
    // expo-share-intent wants its provider above the others.
    <ShareIntentProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.paper }}>
        {/* The cache is saved on the device so the app opens offline; see lib/offline.ts. */}
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions} onSuccess={onCacheRestored}>
          <PreferencesProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.paper },
                animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
              }}
            >
              {/* When a guard flips (sign-in, sign-out) the router falls back to index, which picks the next screen. */}
              <Stack.Screen name="index" options={{ animation: "none" }} />
              <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
                <Stack.Screen name="sign-in" options={{ animation: "fade", gestureEnabled: false }} />
              </Stack.Protected>
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
                <Stack.Screen name="item/[id]" options={{ contentStyle: { backgroundColor: palette.night } }} />
                <Stack.Screen
                  name="new/type"
                  options={{
                    presentation: "formSheet",
                    sheetAllowedDetents: [0.82, 1],
                    sheetGrabberVisible: true,
                    sheetCornerRadius: 34,
                    contentStyle: { backgroundColor: palette.paper },
                  }}
                />
                <Stack.Screen name="new/outputs" />
                <Stack.Screen name="new/progress" options={{ gestureEnabled: false }} />
                <Stack.Screen name="paywall" options={{ presentation: "modal", contentStyle: { backgroundColor: palette.night } }} />
                <Stack.Screen name="share" options={{ animation: "fade", gestureEnabled: false }} />
                <Stack.Screen name="stats" />
                <Stack.Screen name="credits" />
              </Stack.Protected>
            </Stack>
            <ShareIntake signedIn={signedIn} />
            {signedIn ? <OfflineNotice /> : null}
          </PreferencesProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}
