"use client";

// src/components/modules/clients/StatusBadge.tsx

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  INACTIVE:  "bg-slate-100 text-slate-600 border border-slate-200",
  PROSPECT:  "bg-blue-50 text-blue-700 border border-blue-200",
  ON_HOLD:   "bg-amber-50 text-amber-700 border border-amber-200",
  CHURNED:   "bg-red-50 text-red-600 border border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   "Active",
  INACTIVE: "Inactive",
  PROSPECT: "Prospect",
  ON_HOLD:  "On Hold",
  CHURNED:  "Churned",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
