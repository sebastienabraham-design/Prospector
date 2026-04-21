import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@workspace/api-client-react";
import { Status, STATUS_COLORS, STATUS_FILTERS, STATUS_LABELS } from "@/constants/statuses";

const PLUFUR_REGION = {
  latitude: 48.5897,
  longitude: -3.4558,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data: contacts, isLoading } = useContacts();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  const filteredContacts = useMemo(() => {
    return (contacts ?? []).filter((c) => filter === "all" || c.status === filter);
  }, [contacts, filter]);

  const handleMapPress = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: "/add-contact",
        params: { lat: latitude, lng: longitude },
      });
    },
    []
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={PLUFUR_REGION}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        mapType={Platform.OS === "ios" && colorScheme === "dark" ? "mutedStandard" : "standard"}
      >
        {filteredContacts.map((contact) => {
          const isSelected = selectedId === contact.id;
          const pinColor = STATUS_COLORS[contact.status as Status] ?? colors.tint;
          return (
            <Marker
              key={contact.id}
              coordinate={{ latitude: contact.latitude, longitude: contact.longitude }}
              onPress={() => {
                setSelectedId(contact.id);
                Haptics.selectionAsync();
              }}
            >
              <View style={[styles.pin, isSelected && styles.pinSelected, { backgroundColor: pinColor }]}>
                <Ionicons name="person" size={isSelected ? 16 : 12} color="white" />
              </View>
              <Callout
                onPress={() =>
                  router.push({ pathname: "/contact/[id]", params: { id: contact.id } })
                }
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{contact.name}</Text>
                  {contact.address ? (
                    <Text style={styles.calloutAddress} numberOfLines={1}>
                      {contact.address}
                    </Text>
                  ) : null}
                  <Text style={styles.calloutTap}>Appuyer pour ouvrir →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Header */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <View style={[styles.titleCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="map" size={18} color={colors.tint} />
          <Text style={[styles.title, { color: colors.text }]}>Carte</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {filteredContacts.length}
            </Text>
          )}
        </View>
      </View>

      {/* Filter row */}
      <View style={[styles.filterRow, { top: insets.top + 62 }]}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              setFilter(f);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filter === f
                    ? f === "all" ? colors.tint : (STATUS_COLORS[f as Status] ?? colors.tint)
                    : colors.card,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: filter === f ? "white" : colors.textSecondary },
              ]}
            >
              {STATUS_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* FAB */}
      <View
        style={[
          styles.fab,
          { bottom: insets.bottom + 90, backgroundColor: colors.tint, shadowColor: colors.shadow },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/add-contact", params: { lat: "", lng: "" } });
          }}
          style={styles.fabPressable}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      </View>

      {/* Hint */}
      <View style={[styles.hint, { bottom: insets.bottom + 90, left: 16 }]}>
        <View style={[styles.hintCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="finger-print-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>Appuyer pour ajouter</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  titleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    alignSelf: "flex-start",
  },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  count: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 4 },
  filterRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinSelected: { width: 42, height: 42, borderRadius: 21 },
  callout: { padding: 10, maxWidth: 180 },
  calloutName: { fontSize: 14, fontWeight: "600", color: "#000" },
  calloutAddress: { fontSize: 12, color: "#666", marginTop: 2 },
  calloutTap: { fontSize: 11, color: "#3B82F6", marginTop: 6, fontWeight: "500" },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
  },
  hint: { position: "absolute" },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
