import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Colors from "@/constants/colors";

function formatDateFR(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openDateTimePicker(currentIso: string, onPick: (iso: string) => void): void {
  const initial = currentIso ? new Date(currentIso) : new Date();
  if (Platform.OS === "android") {
    DateTimePickerAndroid.open({
      value: initial,
      mode: "date",
      minimumDate: new Date(),
      onChange: (evt, date) => {
        if (evt.type !== "set" || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          is24Hour: true,
          onChange: (evt2, time) => {
            if (evt2.type !== "set" || !time) return;
            const merged = new Date(date);
            merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onPick(merged.toISOString());
          },
        });
      },
    });
  }
}
import {
  useContact,
  useUpdateContact,
  useDeleteContact,
  useActions,
  useCreateAction,
  useUpdateAction,
  useDeleteAction,
} from "@/hooks/useContacts";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionItem } from "@/components/ActionItem";
import type { Action } from "@workspace/api-client-react";

type Status = "new" | "contacted" | "interested" | "not_interested" | "closed";
type ActionType = "call" | "visit" | "email" | "meeting" | "other";

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "New", color: "#3B82F6" },
  { value: "contacted", label: "Contacted", color: "#F59E0B" },
  { value: "interested", label: "Interested", color: "#10B981" },
  { value: "not_interested", label: "Not Int.", color: "#EF4444" },
  { value: "closed", label: "Closed", color: "#8B5CF6" },
];

const ACTION_TYPES: { value: ActionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "call", label: "Appel", icon: "call" },
  { value: "visit", label: "Visite", icon: "home" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "meeting", label: "RDV", icon: "people" },
  { value: "other", label: "Autre", icon: "ellipsis-horizontal-circle" },
];

export default function ContactDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data: contact, isLoading } = useContact(id);
  const { data: actions } = useActions(id);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createAction = useCreateAction();
  const updateAction = useUpdateAction();
  const deleteAction = useDeleteAction();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStatus, setEditStatus] = useState<Status>("new");
  const [editNotes, setEditNotes] = useState("");

  // Add action state
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionType, setActionType] = useState<ActionType>("call");
  const [actionDate, setActionDate] = useState("");
  const [actionDesc, setActionDesc] = useState("");

  const startEditing = () => {
    if (!contact) return;
    setEditName(contact.name);
    setEditPhone(contact.phone ?? "");
    setEditEmail(contact.email ?? "");
    setEditAddress(contact.address ?? "");
    setEditStatus(contact.status as Status);
    setEditNotes(contact.notes ?? "");
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!contact || !editName.trim()) return;
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: {
          name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          address: editAddress.trim() || null,
          status: editStatus,
          notes: editNotes.trim() || null,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'enregistrer les modifications.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer le contact",
      "Toutes les actions de suivi seront aussi supprimées. Action irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteContact.mutateAsync(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleAddAction = async () => {
    if (!actionTitle.trim() || !contact) return;
    try {
      await createAction.mutateAsync({
        contactId: contact.id,
        title: actionTitle.trim(),
        description: actionDesc.trim() || null,
        dueDate: actionDate || null,
        actionType,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddAction(false);
      setActionTitle("");
      setActionDate("");
      setActionDesc("");
      setActionType("call");
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'ajouter l'action.");
    }
  };

  const handleToggleAction = (action: Action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAction.mutate({ id: action.id, data: { completed: !action.completed } });
  };

  const handleDeleteAction = (actionId: number) => {
    Alert.alert("Supprimer l'action", "Êtes-vous sûr ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteAction.mutate(actionId);
        },
      },
    ]);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const inputStyle = [
    styles.input,
    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
  ];
  const labelStyle = [styles.fieldLabel, { color: colors.textSecondary }];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Contact introuvable</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.tint, fontFamily: "Inter_600SemiBold" }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 8,
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {contact.name}
        </Text>
        <View style={styles.headerActions}>
          {!editing ? (
            <>
              <Pressable onPress={startEditing} hitSlop={8} style={styles.headerBtn}>
                <Ionicons name="pencil" size={18} color={colors.tint} />
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={8} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.statusNotInterested} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => setEditing(false)} hitSlop={8} style={styles.headerBtn}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={saveEdits}
                style={[styles.saveChip, { backgroundColor: colors.tint }]}
              >
                {updateContact.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveChipText}>Enregistrer</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + status */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + "22" }]}>
            <Text style={[styles.initials, { color: colors.tint }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editing ? (
              <TextInput
                style={[inputStyle, { marginBottom: 8 }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            ) : (
              <Text style={[styles.name, { color: colors.text }]}>{contact.name}</Text>
            )}
            <StatusBadge status={editing ? editStatus : (contact.status as "new")} />
          </View>
        </View>

        {/* Status selector (edit mode) */}
        {editing && (
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Statut</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setEditStatus(opt.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: editStatus === opt.value ? opt.color : colors.background,
                      borderColor: editStatus === opt.value ? opt.color : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: editStatus === opt.value ? "white" : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Contact info */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Coordonnées</Text>

          <View style={styles.infoGrid}>
            <InfoRow
              icon="call"
              label="Phone"
              value={editing ? undefined : contact.phone}
              editing={editing}
              editValue={editPhone}
              onEdit={setEditPhone}
              placeholder="+33 6 ..."
              inputStyle={inputStyle}
              colors={colors}
              keyboardType="phone-pad"
            />
            <InfoRow
              icon="mail"
              label="Email"
              value={editing ? undefined : contact.email}
              editing={editing}
              editValue={editEmail}
              onEdit={setEditEmail}
              placeholder="email@..."
              inputStyle={inputStyle}
              colors={colors}
              keyboardType="email-address"
            />
            <InfoRow
              icon="location"
              label="Address"
              value={editing ? undefined : contact.address}
              editing={editing}
              editValue={editAddress}
              onEdit={setEditAddress}
              placeholder="Street address"
              inputStyle={inputStyle}
              colors={colors}
            />
            {!editing && (
              <View style={styles.infoRow}>
                <Ionicons name="navigate" size={15} color={colors.textSecondary} />
                <View>
                  <Text style={[labelStyle, { fontSize: 11 }]}>Coordonnées GPS</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {contact.latitude.toFixed(5)}, {contact.longitude.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
            {contact.propertyType && !editing && (
              <View style={styles.infoRow}>
                <Ionicons name="home" size={15} color={colors.textSecondary} />
                <View>
                  <Text style={[labelStyle, { fontSize: 11 }]}>Type de bien</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]} style={{ textTransform: "capitalize" }}>
                    {contact.propertyType}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          {editing ? (
            <TextInput
              style={[inputStyle, styles.notesInput]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : contact.notes ? (
            <Text style={[styles.notes, { color: colors.text }]}>{contact.notes}</Text>
          ) : (
            <Text style={[styles.emptyNotes, { color: colors.textSecondary }]}>
              No notes yet
            </Text>
          )}
        </View>

        {/* Follow-up actions */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Follow-up Actions ({(actions ?? []).length})
            </Text>
            <Pressable
              onPress={() => {
                setShowAddAction(!showAddAction);
                Haptics.selectionAsync();
              }}
              style={[styles.addActionBtn, { backgroundColor: colors.tint + "15" }]}
            >
              <Ionicons name={showAddAction ? "close" : "add"} size={16} color={colors.tint} />
              <Text style={[styles.addActionText, { color: colors.tint }]}>
                {showAddAction ? "Cancel" : "Add"}
              </Text>
            </Pressable>
          </View>

          {showAddAction && (
            <View
              style={[
                styles.addActionCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[labelStyle, { marginBottom: 4 }]}>Type d'action</Text>
              <View style={styles.chipRow}>
                {ACTION_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    onPress={() => setActionType(t.value)}
                    style={[
                      styles.propertyChip,
                      {
                        backgroundColor:
                          actionType === t.value ? colors.tint + "15" : colors.backgroundSecondary,
                        borderColor:
                          actionType === t.value ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.icon}
                      size={13}
                      color={actionType === t.value ? colors.tint : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: actionType === t.value ? colors.tint : colors.textSecondary },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[labelStyle, { marginTop: 10, marginBottom: 4 }]}>Titre *</Text>
              <TextInput
                style={[inputStyle, { backgroundColor: colors.backgroundSecondary }]}
                value={actionTitle}
                onChangeText={setActionTitle}
                placeholder="Appeler pour fixer un rendez-vous"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[labelStyle, { marginTop: 10, marginBottom: 4 }]}>Échéance</Text>
              <Pressable
                onPress={() => openDateTimePicker(actionDate, setActionDate)}
                style={[inputStyle, { backgroundColor: colors.backgroundSecondary, justifyContent: "center" }]}
              >
                <Text style={{ color: actionDate ? colors.text : colors.textSecondary, fontFamily: "Inter_400Regular" }}>
                  {actionDate ? formatDateFR(actionDate) : "Choisir date et heure"}
                </Text>
              </Pressable>
              {actionDate ? (
                <Pressable onPress={() => setActionDate("")} style={{ alignSelf: "flex-end", marginTop: 4 }}>
                  <Text style={{ color: colors.tint, fontSize: 12, fontFamily: "Inter_500Medium" }}>Effacer</Text>
                </Pressable>
              ) : null}

              <Text style={[labelStyle, { marginTop: 10, marginBottom: 4 }]}>Notes</Text>
              <TextInput
                style={[inputStyle, styles.smallNotes, { backgroundColor: colors.backgroundSecondary }]}
                value={actionDesc}
                onChangeText={setActionDesc}
                placeholder="Détails supplémentaires..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Pressable
                onPress={handleAddAction}
                disabled={!actionTitle.trim() || createAction.isPending}
                style={[
                  styles.saveActionBtn,
                  { backgroundColor: actionTitle.trim() ? colors.tint : colors.border },
                ]}
              >
                {createAction.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.saveActionText}>Ajouter l'action</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {(actions ?? []).length === 0 ? (
            <View style={styles.emptyActions}>
              <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyActionsText, { color: colors.textSecondary }]}>
                No follow-up actions
              </Text>
            </View>
          ) : (
            <View style={{ marginHorizontal: -16 }}>
              {(actions ?? []).map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onToggle={() => handleToggleAction(action)}
                  onPress={() => handleDeleteAction(action.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Created date */}
        <Text style={[styles.createdAt, { color: colors.textSecondary }]}>
          Added {new Date(contact.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </Text>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  editing,
  editValue,
  onEdit,
  placeholder,
  inputStyle,
  colors,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  editing: boolean;
  editValue?: string;
  onEdit?: (v: string) => void;
  placeholder?: string;
  inputStyle: any;
  colors: any;
  keyboardType?: any;
}) {
  if (editing) {
    return (
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11 }]}>{label}</Text>
        <TextInput
          style={inputStyle}
          value={editValue}
          onChangeText={onEdit}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType}
        />
      </View>
    );
  }
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11 }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 80,
    justifyContent: "flex-end",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  saveChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 48,
    alignItems: "center",
  },
  saveChipText: {
    color: "white",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 16,
    gap: 0,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  section: {
    borderTopWidth: 1,
    paddingVertical: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  emptyNotes: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  notesInput: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  propertyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  addActionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  saveActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveActionText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  smallNotes: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  emptyActions: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  emptyActionsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  createdAt: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingTop: 6,
  },
});
