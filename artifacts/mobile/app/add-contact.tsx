import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useCreateContact } from "@/hooks/useContacts";
import { Status, STATUS_OPTIONS } from "@/constants/statuses";
import { PropertyType, PROPERTY_OPTIONS } from "@/constants/propertyTypes";

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
  const [gettingLocation, setGettingLocation] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const isValid = name.trim().length > 0 && lat.trim() !== "" && lng.trim() !== "";

  const useMyLocation = async () => {
    try {
      setGettingLocation(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Autorisez la localisation dans les paramètres pour utiliser cette fonctionnalité."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
      setAccuracy(pos.coords.accuracy ?? null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'obtenir votre position. Vérifiez que le GPS est activé.");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert("Champs manquants", "Le nom et les coordonnées sont obligatoires.");
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      Alert.alert("Coordonnées invalides", "Veuillez saisir une latitude et longitude valides.");
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
      Alert.alert("Erreur", "Impossible d'enregistrer le prospect. Veuillez réessayer.");
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
  ];

  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* En-tête */}
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
          <Text style={[styles.cancelBtn, { color: colors.textSecondary }]}>Annuler</Text>
        </Pressable>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Nouveau Prospect</Text>
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
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Bouton "Utiliser ma position" */}
        <Pressable
          onPress={useMyLocation}
          disabled={gettingLocation}
          style={[
            styles.locationBtn,
            { backgroundColor: colors.tint + "15", borderColor: colors.tint },
          ]}
        >
          {gettingLocation ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Ionicons name="navigate" size={16} color={colors.tint} />
          )}
          <Text style={[styles.locationBtnText, { color: colors.tint }]}>
            {gettingLocation ? "Localisation..." : "Utiliser ma position"}
          </Text>
        </Pressable>

        {/* Coordonnées capturées */}
        {lat && lng ? (
          <View style={[styles.locationBanner, { backgroundColor: colors.tint + "15" }]}>
            <Ionicons name="location" size={14} color={colors.tint} />
            <Text style={[styles.locationText, { color: colors.tint }]}>
              {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
              {accuracy !== null ? `  •  ±${Math.round(accuracy)} m` : ""}
            </Text>
          </View>
        ) : null}

        {/* Nom */}
        <View style={styles.field}>
          <Text style={labelStyle}>Nom *</Text>
          <TextInput
            style={inputStyle}
            placeholder="Nom complet"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Téléphone & Email */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={labelStyle}>Téléphone</Text>
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

        {/* Adresse */}
        <View style={styles.field}>
          <Text style={labelStyle}>Adresse</Text>
          <TextInput
            style={inputStyle}
            placeholder="Rue, ville..."
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Coordonnées (si non encore capturées par GPS ou tap carte) */}
        {(!lat || !lng) ? (
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Latitude *</Text>
              <TextInput
                style={inputStyle}
                placeholder="48.562"
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
                placeholder="-3.465"
                placeholderTextColor={colors.textSecondary}
                value={lng}
                onChangeText={setLng}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : null}

        {/* Statut */}
        <View style={styles.field}>
          <Text style={labelStyle}>Statut</Text>
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

        {/* Type de bien */}
        <View style={styles.field}>
          <Text style={labelStyle}>Type de bien</Text>
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
            placeholder="Détails de la rencontre, observations..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  locationBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
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
