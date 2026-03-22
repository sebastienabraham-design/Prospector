import { Ionicons } from "@expo/vector-icons";

export type PropertyType =
  | "house"
  | "apartment"
  | "land"
  | "commercial"
  | "other";

export const PROPERTY_OPTIONS: {
  value: PropertyType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "house", label: "Maison", icon: "home" },
  { value: "apartment", label: "Appartement", icon: "business" },
  { value: "land", label: "Terrain", icon: "leaf" },
  { value: "commercial", label: "Commercial", icon: "storefront" },
  { value: "other", label: "Autre", icon: "cube" },
];
