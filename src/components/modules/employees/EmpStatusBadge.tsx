"use client";

const STYLES: Record<string, string> = {
  DRAFT:         "bg-slate-100 text-slate-600 border border-slate-200",
  ACTIVE:        "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PROBATION:     "bg-blue-50 text-blue-700 border border-blue-200",
  NOTICE_PERIOD: "bg-amber-50 text-amber-700 border border-amber-200",
  RESIGNED:      "bg-orange-50 text-orange-700 border border-orange-200",
  TERMINATED:    "bg-red-50 text-red-600 border border-red-200",
  INACTIVE:      "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:      "bg-purple-50 text-purple-600 border border-purple-200",
};

const LABELS: Record<string, string> = {
  DRAFT:         "Draft",
  ACTIVE:        "Active",
  PROBATION:     "Probation",
  NOTICE_PERIOD: "Notice Period",
  RESIGNED:      "Resigned",
  TERMINATED:    "Terminated",
  INACTIVE:      "Inactive",
  ARCHIVED:      "Archived",
};

export function EmpStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
