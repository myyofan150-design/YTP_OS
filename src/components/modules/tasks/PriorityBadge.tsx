"use client";

// src/components/modules/tasks/PriorityBadge.tsx

const STYLES: Record<string, string> = {
  URGENT: "bg-red-50 text-red-700 border border-red-200",
  HIGH:   "bg-orange-50 text-orange-700 border border-orange-200",
  MEDIUM: "bg-blue-50 text-blue-700 border border-blue-200",
  LOW:    "bg-slate-100 text-slate-500 border border-slate-200",
};

export function PriorityBadge({ priority, size = "sm" }: { priority: string; size?: "xs" | "sm" }) {
  const base = size === "xs" ? "px-1.5 py-px text-[10px]" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${base} ${STYLES[priority] ?? STYLES["MEDIUM"]}`}>
      {priority}
    </span>
  );
}
