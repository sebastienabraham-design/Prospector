import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSyncStatus } from "@/lib/sync-manager";

type SyncState = "hidden" | "syncing" | "offline" | "offline-pending" | "error";

function getSyncState(status: ReturnType<typeof useSyncStatus>): SyncState {
  if (status.hasError) return "error";
  if (!status.isConnected && status.pendingCount > 0) return "offline-pending";
  if (!status.isConnected) return "offline";
  if (status.isSyncing) return "syncing";
  if (status.pendingCount > 0) return "syncing";
  return "hidden";
}

const stateConfig: Record<
  Exclude<SyncState, "hidden">,
  { bg: string; icon: keyof typeof Ionicons.glyphMap; text: string }
> = {
  syncing: {
    bg: "#3B82F6",
    icon: "sync-outline",
    text: "Synchronisation...",
  },
  offline: {
    bg: "#6B7280",
    icon: "cloud-offline-outline",
    text: "Hors ligne",
  },
  "offline-pending": {
    bg: "#F59E0B",
    icon: "cloud-offline-outline",
    text: "", // Dynamic
  },
  error: {
    bg: "#EF4444",
    icon: "alert-circle-outline",
    text: "Erreur de synchronisation",
  },
};

export function SyncStatusBar() {
  const status = useSyncStatus();
  const syncState = getSyncState(status);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: syncState === "hidden" ? 0 : 32,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [syncState, heightAnim]);

  useEffect(() => {
    if (syncState === "syncing") {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [syncState, spinAnim]);

  if (syncState === "hidden") {
    return <Animated.View style={{ height: heightAnim }} />;
  }

  const config = stateConfig[syncState];
  const displayText =
    syncState === "offline-pending"
      ? `Hors ligne \u2014 ${status.pendingCount} modification${status.pendingCount > 1 ? "s" : ""} en attente`
      : config.text;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const content = (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Animated.View
        style={syncState === "syncing" ? { transform: [{ rotate: spin }] } : undefined}
      >
        <Ionicons name={config.icon} size={14} color="white" />
      </Animated.View>
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );

  if (syncState === "error") {
    return (
      <Animated.View style={{ height: heightAnim, overflow: "hidden" }}>
        <TouchableOpacity onPress={status.triggerSync} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ height: heightAnim, overflow: "hidden" }}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
