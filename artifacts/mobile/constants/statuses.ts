export type Status =
  | "new"
  | "contacted"
  | "interested"
  | "not_interested"
  | "closed";

export const STATUS_COLORS: Record<Status, string> = {
  new: "#3B82F6",
  contacted: "#F59E0B",
  interested: "#10B981",
  not_interested: "#EF4444",
  closed: "#8B5CF6",
};

export const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "Nouveau", color: STATUS_COLORS.new },
  { value: "contacted", label: "Contacté", color: STATUS_COLORS.contacted },
  { value: "interested", label: "Intéressé", color: STATUS_COLORS.interested },
  { value: "not_interested", label: "Pas intéressé", color: STATUS_COLORS.not_interested },
  { value: "closed", label: "Conclu", color: STATUS_COLORS.closed },
];

export const STATUS_LABELS: Record<Status | "all", string> = {
  all: "Tous",
  new: "Nouveau",
  contacted: "Contacté",
  interested: "Intéressé",
  not_interested: "Pas int.",
  closed: "Conclu",
};

export const STATUS_FILTERS: (Status | "all")[] = [
  "all",
  "new",
  "contacted",
  "interested",
  "not_interested",
  "closed",
];
