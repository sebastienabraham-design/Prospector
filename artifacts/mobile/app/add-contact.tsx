import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Colors from "@/constants/colors";
import { useCreateContact } from "@/hooks/useContacts";

type Status = "new" | "contacted" | "interested" | "not_interested" | "closed";
type PropertyType = "house" | "apartment" | "land" | "commercial" | "other";

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "New", color: "#3B82F6" },
  { value: "contacted", label: "Contacted", color: "#F59E0B" },
  { value: "interested", label: "Interested", color: "#10B981" },
  { value: "not_interested", label: "Not Interested", color: "#EF4444" },
  { value: "closed", label: "Closed", color: "#8B5CF6" },
];

const PROPERTY_OPTIONS: { value: PropertyType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "house", label: "House", icon: "home" },
  { value: "apartment", label: "Apartment", icon: "business" },
  { value: "land", label: "Land", icon: "leaf" },
  { value: "commercial", label: "Commercial", icon: "storefront" },
  { value: "other", label: "Other", icon: "cube" },
];

export default function AddContactScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const createContact = useCreateContact();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(params.lat ?? "");
  const [lng, setLng] = useState(params.lng ?? "");
  const [status, setStatus] = useState<Status>("new");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [notes, setNotes] = useState("");

  const isValid = name.trim().length > 0 && lat.trim() !== "" && lng.trim() !== "";

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert("Missing Fields", "Name and location coordinates are required.");
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      Alert.alert("Invalid Coordinates", "Please enter valid latitude and longitude.");
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createContact.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        latitude,
        longitude,
        status,
        notes: notes.trim() || null,
        propertyType: propertyType || null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to save contact. Please try again.");
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
  ];

  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Sheet header */}
      <View
        style={[
          styles.sheetHeader,
          {
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === "ios" ? 8 : (Platform.OS === "web" ? 67 : insets.top + 8),
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancelBtn, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>New Prospect</Text>
        <Pressable
          onPress={handleSave}
          disabled={!isValid || createContact.isPending}
          style={[
            styles.saveBtn,
            { backgroundColor: isValid ? colors.tint : colors.border },
          ]}
        >
          {createContact.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        {/* Location info */}
        {params.lat && params.lng ? (
          <View style={[styles.locationBanner, { backgroundColor: colors.tint + "15" }]}>
            <Ionicons name="location" size={14} color={colors.tint} />
            <Text style={[styles.locationText, { color: colors.tint }]}>
              {parseFloat(params.lat).toFixed(5)}, {parseFloat(params.lng).toFixed(5)}
            </Text>
          </View>
        ) : null}

        {/* Name */}
        <View style={styles.field}>
          <Text style={labelStyle}>Name *</Text>
          <TextInput
            style={inputStyle}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Phone & Email */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={labelStyle}>Phone</Text>
            <TextInput
              style={inputStyle}
              placeholder="+33 6 ..."
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              style={inputStyle}
              placeholder="email@..."
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.field}>
          <Text style={labelStyle}>Address</Text>
          <TextInput
            style={inputStyle}
            placeholder="Street address"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Coordinates (if not set by map) */}
        {(!params.lat || !params.lng) ? (
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Latitude *</Text>
              <TextInput
                style={inputStyle}
                placeholder="48.8566"
                placeholderTextColor={colors.textSecondary}
                value={lat}
                onChangeText={setLat}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Longitude *</Text>
              <TextInput
                style={inputStyle}
                placeholder="2.3522"
                placeholderTextColor={colors.textSecondary}
                value={lng}
                onChangeText={setLng}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : null}

        {/* Status */}
        <View style={styles.field}>
          <Text style={labelStyle}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setStatus(opt.value);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      status === opt.value ? opt.color : colors.background,
                    borderColor:
                      status === opt.value ? opt.color : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: status === opt.value ? "white" : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Property type */}
        <View style={styles.field}>
          <Text style={labelStyle}>Property Type</Text>
          <View style={styles.chipRow}>
            {PROPERTY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setPropertyType(propertyType === opt.value ? "" : opt.value);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.propertyChip,
                  {
                    backgroundColor:
                      propertyType === opt.value ? colors.tint + "15" : colors.background,
                    borderColor:
                      propertyType === opt.value ? colors.tint : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={propertyType === opt.value ? colors.tint : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        propertyType === opt.value ? colors.tint : colors.textSecondary,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={labelStyle}>Notes</Text>
          <TextInput
            style={[inputStyle, styles.notesInput]}
            placeholder="Add encounter details, observations..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  cancelBtn: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minWidth: 60,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  notesInput: {
    height: 90,
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  propertyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
