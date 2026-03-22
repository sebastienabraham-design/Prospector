import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type Status = "new" | "contacted" | "interested" | "not_interested" | "closed";

const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  closed: "Closed",
};

interface Props {
  status: Status;
  small?: boolean;
}

export function StatusBadge({ status, small }: Props) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;

  const colorMap: Record<Status, string> = {
    new: colors.statusNew,
    contacted: colors.statusContacted,
    interested: colors.statusInterested,
    not_interested: colors.statusNotInterested,
    closed: colors.statusClosed,
  };

  const color = colorMap[status] ?? colors.tint;

  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.label,
          small && styles.smallLabel,
          { color },
        ]}
      >
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  smallLabel: {
    fontSize: 10,
  },
});
