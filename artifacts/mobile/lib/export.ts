import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import type { Contact, Action } from "@workspace/api-client-react";
import { STATUS_LABELS } from "@/constants/statuses";
import { PROPERTY_OPTIONS } from "@/constants/propertyTypes";
import type { Status } from "@/constants/statuses";

const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_OPTIONS.map((p) => [p.value, p.label])
);

// BOM for Excel to detect UTF-8
const UTF8_BOM = "\uFEFF";
const SEPARATOR = ";"; // Semicolon works better with French Excel (comma is decimal separator)

function escapeCsvField(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const str = String(value);
  if (str.includes(SEPARATOR) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  call: "Appel",
  visit: "Visite",
  email: "Email",
  meeting: "Rendez-vous",
  other: "Autre",
};

export function contactsToCsv(contacts: Contact[]): string {
  const headers = [
    "Nom",
    "Téléphone",
    "Email",
    "Adresse",
    "Statut",
    "Type de bien",
    "Notes",
    "Latitude",
    "Longitude",
    "Créé le",
    "Modifié le",
  ];

  const rows = contacts.map((c) => [
    escapeCsvField(c.name),
    escapeCsvField(c.phone),
    escapeCsvField(c.email),
    escapeCsvField(c.address),
    escapeCsvField(STATUS_LABELS[c.status as Status] ?? c.status),
    escapeCsvField(
      c.propertyType
        ? (PROPERTY_TYPE_LABELS[c.propertyType] ?? c.propertyType)
        : ""
    ),
    escapeCsvField(c.notes),
    escapeCsvField(String(c.latitude)),
    escapeCsvField(String(c.longitude)),
    escapeCsvField(formatDateTime(c.createdAt)),
    escapeCsvField(formatDateTime(c.updatedAt)),
  ]);

  return (
    UTF8_BOM +
    headers.map(escapeCsvField).join(SEPARATOR) +
    "\n" +
    rows.map((r) => r.join(SEPARATOR)).join("\n")
  );
}

export function actionsToCsv(
  actions: Action[],
  contactNames: Record<number, string>
): string {
  const headers = [
    "Contact",
    "Action",
    "Type",
    "Date prévue",
    "Description",
    "Terminé",
    "Créé le",
  ];

  const rows = actions.map((a) => [
    escapeCsvField(contactNames[a.contactId] ?? `Contact #${a.contactId}`),
    escapeCsvField(a.title),
    escapeCsvField(ACTION_TYPE_LABELS[a.actionType] ?? a.actionType),
    escapeCsvField(formatDate(a.dueDate)),
    escapeCsvField(a.description),
    escapeCsvField(a.completed ? "Oui" : "Non"),
    escapeCsvField(formatDateTime(a.createdAt)),
  ]);

  return (
    UTF8_BOM +
    headers.map(escapeCsvField).join(SEPARATOR) +
    "\n" +
    rows.map((r) => r.join(SEPARATOR)).join("\n")
  );
}

export async function exportAndShare(
  csvContent: string,
  filename: string
): Promise<void> {
  try {
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (Platform.OS === "web") {
      // Web fallback: trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Partage indisponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: `Exporter ${filename}`,
      UTI: "public.comma-separated-values-text",
    });
  } catch {
    Alert.alert("Erreur", "Impossible d'exporter le fichier.");
  }
}
