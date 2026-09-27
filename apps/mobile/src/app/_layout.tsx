import "../global.css";

import { useEffect } from "react";
import { Platform } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider } from "@/lib/session";
import { fontAssets } from "@/theme/fonts";
import { palette } from "@/theme";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.paper);
  }, []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  // Keep the splash up until DM Sans / Instrument Serif / JetBrains Mono are ready.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.paper }}>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.paper },
            animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
          }}
        >
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="sign-in" options={{ animation: "fade", gestureEnabled: false }} />
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
        </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
