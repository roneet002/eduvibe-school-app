import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Image, LogBox, Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/auth/auth-context";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { LanguageProvider } from "@/src/i18n/language";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

// Pre-warm icon fonts for Android Expo Go (do not remove).
const ICON_SOURCES = [
  require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
];

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      ICON_SOURCES.forEach((src) => {
        try {
          Image.prefetch(Image.resolveAssetSource(src).uri);
        } catch {}
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <LanguageProvider>
              <AuthProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </AuthProvider>
            </LanguageProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
