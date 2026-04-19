"use client";

// src/components/modules/employees/EmpStatusBadge.tsx

const STYLES: Record<string, string> = {
  ACTIVE:        "bg-emerald-50 text-emerald-700 border border-emerald-200",
  INACTIVE:      "bg-slate-100 text-slate-600 border border-slate-200",
  NOTICE_PERIOD: "bg-amber-50 text-amber-700 border border-amber-200",
  TERMINATED:    "bg-red-50 text-red-600 border border-red-200",
};

const LABELS: Record<string, string> = {
  ACTIVE:        "Active",
  INACTIVE:      "Inactive",
  NOTICE_PERIOD: "Notice Period",
  TERMINATED:    "Terminated",
};

export function EmpStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
