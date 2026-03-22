import React from "react";
import { View, Text, StyleSheet, Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Action } from "@workspace/api-client-react";

type ActionType = "call" | "visit" | "email" | "meeting" | "other";

const ACTION_ICONS: Record<ActionType, keyof typeof Ionicons.glyphMap> = {
  call: "call",
  visit: "home",
  email: "mail",
  meeting: "people",
  other: "ellipsis-horizontal-circle",
};

const ACTION_COLORS: Record<ActionType, string> = {
  call: "#10B981",
  visit: "#3B82F6",
  email: "#F59E0B",
  meeting: "#8B5CF6",
  other: "#64748B",
};

interface Props {
  action: Action;
  contactName?: string;
  onToggle: () => void;
  onPress: () => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `Overdue · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function ActionItem({ action, contactName, onToggle, onPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const type = action.actionType as ActionType;
  const iconColor = ACTION_COLORS[type] ?? colors.textSecondary;
  const overdue = !action.completed && isOverdue(action.dueDate);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          opacity: pressed ? 0.85 : 1,
        },
        action.completed && { opacity: 0.55 },
      ]}
    >
      <Pressable onPress={onToggle} style={styles.checkbox} hitSlop={8}>
        <View
          style={[
            styles.checkCircle,
            action.completed
              ? { backgroundColor: colors.statusInterested, borderColor: colors.statusInterested }
              : { borderColor: colors.border },
          ]}
        >
          {action.completed && (
            <Ionicons name="checkmark" size={12} color="white" />
          )}
        </View>
      </Pressable>

      <View style={[styles.typeIcon, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={ACTION_ICONS[type]} size={16} color={iconColor} />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
            action.completed && styles.completed,
          ]}
          numberOfLines={1}
        >
          {action.title}
        </Text>
        {contactName ? (
          <Text style={[styles.contactName, { color: colors.tint }]} numberOfLines={1}>
            {contactName}
          </Text>
        ) : null}
        <Text
          style={[
            styles.date,
            { color: overdue ? colors.statusNotInterested : colors.textSecondary },
          ]}
        >
          {overdue && <Ionicons name="alert-circle" size={11} />}
          {" " + formatDate(action.dueDate)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  checkbox: {
    padding: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  completed: {
    textDecorationLine: "line-through",
    fontFamily: "Inter_400Regular",
  },
  contactName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
