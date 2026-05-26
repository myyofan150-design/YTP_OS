"use client";

import type { TodoPriority } from "@/types";

const CONFIG: Record<TodoPriority, { label: string; dot: string; text: string }> = {
  none:   { label: "None",   dot: "#6B7280", text: "#6B7280" },
  low:    { label: "Low",    dot: "#22c55e", text: "#16a34a" },
  medium: { label: "Medium", dot: "#f59e0b", text: "#d97706" },
  high:   { label: "High",   dot: "#ef4444", text: "#dc2626" },
};

interface Props {
  priority: TodoPriority;
  showLabel?: boolean;
  size?: "sm" | "xs";
}

export function PriorityBadge({ priority, showLabel = true, size = "sm" }: Props) {
  const cfg  = CONFIG[priority] ?? CONFIG.none;
  const text = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${text}`} style={{ color: cfg.text }}>
      <span
        className="inline-block rounded-full shrink-0"
        style={{ background: cfg.dot, width: size === "xs" ? 6 : 7, height: size === "xs" ? 6 : 7 }}
      />
      {showLabel && cfg.label}
    </span>
  );
}
