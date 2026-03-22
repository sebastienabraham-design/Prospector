import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "./StatusBadge";
import type { Contact } from "@workspace/api-client-react";

interface Props {
  contact: Contact;
  onPress: () => void;
}

const PROPERTY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  house: "home",
  apartment: "business",
  land: "leaf",
  commercial: "storefront",
};

export function ContactCard({ contact, onPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarColor = getAvatarColor(contact.name);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor + "33" }]}>
        <Text style={[styles.initials, { color: avatarColor }]}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {contact.name}
        </Text>

        {contact.address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text
              style={[styles.address, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {contact.address}
            </Text>
          </View>
        ) : null}

        {contact.phone ? (
          <View style={styles.row}>
            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
              {contact.phone}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        <StatusBadge status={contact.status as "new"} small />
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginTop: 8 }} />
      </View>
    </Pressable>
  );
}

function getAvatarColor(name: string): string {
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  address: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  detail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
});
