import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
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
import { useActions, useContacts, useUpdateAction, useDeleteAction } from "@/hooks/useContacts";
import { ActionItem } from "@/components/ActionItem";
import type { Action } from "@workspace/api-client-react";

type Filter = "all" | "upcoming" | "overdue" | "completed";

function groupByDate(actions: Action[]): { title: string; data: Action[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const nextWeek = new Date(today.getTime() + 7 * 86400000);

  const groups: Record<string, Action[]> = {
    "En retard": [],
    "Aujourd'hui": [],
    "Demain": [],
    "Cette semaine": [],
    "Plus tard": [],
    "Sans date": [],
  };

  for (const action of actions) {
    if (action.completed) continue;
    if (!action.dueDate) {
      groups["Sans date"].push(action);
      continue;
    }
    const d = new Date(action.dueDate);
    if (d < today) groups["En retard"].push(action);
    else if (d < tomorrow) groups["Aujourd'hui"].push(action);
    else if (d < new Date(tomorrow.getTime() + 86400000)) groups["Demain"].push(action);
    else if (d < nextWeek) groups["Cette semaine"].push(action);
    else groups["Plus tard"].push(action);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

export default function AgendaScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data: actions, isLoading, refetch } = useActions();
  const { data: contacts } = useContacts();
  const updateAction = useUpdateAction();
  const deleteAction = useDeleteAction();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const contactMap = useMemo(() => {
    const map: Record<number, string> = {};
    (contacts ?? []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    if (!actions) return [];
    switch (filter) {
      case "upcoming":
        return actions.filter((a) => !a.completed && a.dueDate && new Date(a.dueDate) >= new Date());
      case "overdue":
        return actions.filter((a) => !a.completed && a.dueDate && new Date(a.dueDate) < new Date());
      case "completed":
        return actions.filter((a) => a.completed);
      default:
        return actions;
    }
  }, [actions, filter]);

  const sections = useMemo(() => {
    if (filter === "completed") {
      return [{ title: "Terminés", data: filtered.filter((a) => a.completed) }];
    }
    if (filter === "all") {
      const grouped = groupByDate(filtered);
      const completed = filtered.filter((a) => a.completed);
      if (completed.length > 0) {
        grouped.push({ title: "Terminés", data: completed });
      }
      return grouped;
    }
    return [{ title: filter === "upcoming" ? "À venir" : "En retard", data: filtered }];
  }, [filtered, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggle = (action: Action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAction.mutate({ id: action.id, data: { completed: !action.completed } });
  };

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer l'action", "Êtes-vous sûr ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteAction.mutate(id);
        },
      },
    ]);
  };

  const filters: Filter[] = ["all", "upcoming", "overdue", "completed"];
  const filterLabels: Record<Filter, string> = {
    all: "Tous",
    upcoming: "À venir",
    overdue: "En retard",
    completed: "Terminés",
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const stats = useMemo(() => {
    const all = actions ?? [];
    return {
      total: all.length,
      done: all.filter((a) => a.completed).length,
      overdue: all.filter((a) => !a.completed && a.dueDate && new Date(a.dueDate) < new Date()).length,
    };
  }, [actions]);

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
          <Text style={[styles.title, { color: colors.text }]}>Agenda</Text>
          {stats.overdue > 0 && (
            <View style={[styles.overdueChip, { backgroundColor: colors.statusNotInterested + "22" }]}>
              <Ionicons name="alert-circle" size={13} color={colors.statusNotInterested} />
              <Text style={[styles.overdueText, { color: colors.statusNotInterested }]}>
                {stats.overdue} en retard
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatPill label="Total" value={stats.total} color={colors.tint} />
          <StatPill label="Terminés" value={stats.done} color={colors.statusInterested} />
          <StatPill label="En attente" value={stats.total - stats.done} color={colors.statusContacted} />
        </View>

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => {
                setFilter(f);
                Haptics.selectionAsync();
              }}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === f ? colors.tint : colors.background,
                  borderColor: filter === f ? colors.tint : colors.border,
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

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ActionItem
              action={item}
              contactName={contactMap[item.contactId]}
              onToggle={() => handleToggle(item)}
              onPress={() =>
                router.push({ pathname: "/contact/[id]", params: { id: item.contactId } })
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: colors.background,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: section.title === "En retard" ? colors.statusNotInterested : colors.textSecondary },
                ]}
              >
                {section.title}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {section.data.length}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshing={!!refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune action</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Ajoutez des actions de suivi depuis la fiche d'un prospect
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  return (
    <View style={[styles.statPill, { backgroundColor: color + "15" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
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
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  overdueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  overdueText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  list: {
    paddingTop: 8,
    paddingBottom: 40,
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
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
