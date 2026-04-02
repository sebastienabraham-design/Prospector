import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useContacts } from "@/hooks/useContacts";
import { ContactCard } from "@/components/ContactCard";
import type { Contact } from "@workspace/api-client-react";
import { Status, STATUS_FILTERS, STATUS_LABELS } from "@/constants/statuses";
import { contactsToCsv, exportAndShare } from "@/lib/export";

export default function ContactsScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data: contacts, isLoading, refetch } = useContacts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    let result = contacts;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, search, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!filtered || filtered.length === 0) {
      Alert.alert("Aucune donnée", "Aucun prospect à exporter.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const csv = contactsToCsv(filtered);
    const date = new Date().toISOString().slice(0, 10);
    await exportAndShare(csv, `prospects_${date}.csv`);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 16,
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Prospects</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleExport}
              style={[styles.headerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.tint} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/add-contact", params: { lat: "", lng: "" } });
              }}
              style={[styles.addBtn, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="add" size={22} color="white" />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setStatusFilter(s);
                Haptics.selectionAsync();
              }}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    statusFilter === s ? colors.tint : colors.background,
                  borderColor: statusFilter === s ? colors.tint : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: statusFilter === s ? "white" : colors.textSecondary },
                ]}
              >
                {STATUS_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onPress={() =>
                router.push({ pathname: "/contact/[id]", params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.emptyList,
          ]}
          refreshing={!!refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search ? "Aucun résultat" : "Aucun prospect"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search
                  ? "Essayez un autre terme de recherche"
                  : "Appuyez sur la carte pour ajouter votre premier prospect"}
              </Text>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Text style={[styles.footerCount, { color: colors.textSecondary }]}>
                {filtered.length} prospect{filtered.length !== 1 ? "s" : ""}
              </Text>
            ) : null
          }
        />
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
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  footerCount: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    paddingBottom: 8,
  },
});
