"use client";

// src/components/modules/clients/ContractBadge.tsx

const CONTRACT_STYLES: Record<string, string> = {
  MONTHLY:   "bg-indigo-50 text-indigo-700 border border-indigo-200",
  QUARTERLY: "bg-violet-50 text-violet-700 border border-violet-200",
  ANNUAL:    "bg-purple-50 text-purple-700 border border-purple-200",
  PROJECT:   "bg-slate-100 text-slate-600 border border-slate-200",
};

const CONTRACT_LABELS: Record<string, string> = {
  MONTHLY:   "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL:    "Annual",
  PROJECT:   "Project",
};

export function ContractBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRACT_STYLES[type] ?? "bg-slate-100 text-slate-600"}`}>
      {CONTRACT_LABELS[type] ?? type}
    </span>
  );
}
