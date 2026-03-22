import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@workspace/api-client-react";

type Status = Contact["status"];

const STATUS_COLORS: Record<Status, string> = {
  new: "#3B82F6",
  contacted: "#F59E0B",
  interested: "#10B981",
  not_interested: "#EF4444",
  closed: "#8B5CF6",
};

type FilterStatus = Status | "all";
const filters: FilterStatus[] = ["all", "new", "interested", "contacted", "not_interested", "closed"];
const filterLabels: Record<FilterStatus, string> = {
  all: "All",
  new: "New",
  interested: "Interested",
  contacted: "Contacted",
  not_interested: "Not Int.",
  closed: "Closed",
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data: contacts, isLoading } = useContacts();
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filteredContacts = (contacts ?? []).filter(
    (c) => filter === "all" || c.status === filter
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Web header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Ionicons name="map" size={20} color={colors.tint} />
            <Text style={[styles.title, { color: colors.text }]}>Prospector Map</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[styles.count, { color: colors.textSecondary }]}>
                {filteredContacts.length}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/add-contact", params: { lat: "", lng: "" } });
            }}
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>Add Prospect</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === f
                      ? f === "all" ? colors.tint : (STATUS_COLORS[f as Status] ?? colors.tint)
                      : colors.background,
                  borderColor:
                    filter === f
                      ? f === "all" ? colors.tint : (STATUS_COLORS[f as Status] ?? colors.tint)
                      : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: filter === f ? "white" : colors.textSecondary },
                ]}
              >
                {filterLabels[f]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={72} color={colors.textSecondary} />
        <Text style={[styles.mapTitle, { color: colors.text }]}>Interactive Map</Text>
        <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>
          Scan the QR code to open on your phone and see all prospects on the map
        </Text>
      </View>

      {/* Contacts grid */}
      {filteredContacts.length > 0 && (
        <View style={[styles.grid, { borderTopColor: colors.border }]}>
          <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>
            {filteredContacts.length} prospect{filteredContacts.length !== 1 ? "s" : ""}
          </Text>
          <View style={styles.chips}>
            {filteredContacts.map((c) => {
              const pinColor = STATUS_COLORS[c.status as Status] ?? colors.tint;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: "/contact/[id]", params: { id: c.id } })}
                  style={[
                    styles.contactChip,
                    { backgroundColor: pinColor + "18", borderColor: pinColor + "44" },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: pinColor }]} />
                  <Text style={[styles.chipName, { color: colors.text }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.address ? (
                    <Text style={[styles.chipAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                      {c.address}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  count: { fontSize: 14, fontFamily: "Inter_500Medium" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  mapTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  mapSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  grid: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
    maxHeight: 220,
  },
  gridTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipName: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: 90 },
  chipAddress: { fontSize: 11, fontFamily: "Inter_400Regular", maxWidth: 70 },
});
