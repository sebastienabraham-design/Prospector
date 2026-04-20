import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { initDatabase } from "@/lib/database";
import { initNotifications } from "@/lib/notifications";
import { SyncProvider } from "@/lib/sync-manager";

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN || "localhost:3000";
setBaseUrl(apiDomain.startsWith("http") ? apiDomain : `https://${apiDomain}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="contact/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add-contact"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.9],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
    initNotifications().catch((err) => {
      console.warn("[notifications] init failed", err);
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbReady]);

  if ((!fontsLoaded && !fontError) || !dbReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SyncProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <SyncStatusBar />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SyncProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
