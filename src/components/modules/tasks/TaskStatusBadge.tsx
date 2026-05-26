"use client";

// src/components/modules/tasks/TaskStatusBadge.tsx

const STYLES: Record<string, string> = {
  TODO:        "bg-slate-100 text-slate-600 border border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  IN_REVIEW:   "bg-violet-50 text-violet-700 border border-violet-200",
  DONE:        "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED:   "bg-red-50 text-red-600 border border-red-200",
};

const LABELS: Record<string, string> = {
  TODO:        "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  DONE:        "Done",
  CANCELLED:   "Cancelled",
};

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES["TODO"]}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
