import type React from "react";
import type { TodoPriority, TodoStatus, TodoBgColor } from "@/types";

const BG_COLOR_STYLES: Record<NonNullable<TodoBgColor>, string> = {
  default: "",
  mint:    "bg-emerald-500/10",
  yellow:  "bg-yellow-400/10",
  blue:    "bg-blue-500/10",
  red:     "bg-red-500/10",
  purple:  "bg-purple-500/10",
};

export const BG_COLOR_OPTIONS: Array<{ value: TodoBgColor; label: string; hex: string }> = [
  { value: "default", label: "Default", hex: "transparent" },
  { value: "mint",    label: "Mint",    hex: "#10b981" },
  { value: "yellow",  label: "Yellow",  hex: "#fbbf24" },
  { value: "blue",    label: "Blue",    hex: "#3b82f6" },
  { value: "red",     label: "Red",     hex: "#ef4444" },
  { value: "purple",  label: "Purple",  hex: "#a855f7" },
];

export function taskBgClass(
  priority: TodoPriority,
  status: TodoStatus,
  bgColor?: TodoBgColor | null,
): string {
  if (bgColor && bgColor !== "default") return BG_COLOR_STYLES[bgColor] ?? "";
  if (status === "completed") return "bg-muted/20";
  switch (priority) {
    case "high":   return "bg-red-500/5";
    case "medium": return "bg-amber-500/5";
    case "low":    return "bg-green-500/5";
    default:       return "";
  }
}

export function taskAccentStyle(priority: TodoPriority): React.CSSProperties {
  const colors: Record<TodoPriority, string> = {
    high:   "#ef4444",
    medium: "#f59e0b",
    low:    "#22c55e",
    none:   "transparent",
  };
  return { borderLeft: `3px solid ${colors[priority] ?? "transparent"}` };
}
