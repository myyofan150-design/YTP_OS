"use client";

interface Props {
  date?: string | null;
  showIcon?: boolean;
}

export function DueDateChip({ date, showIcon = true }: Props) {
  if (!date) return null;

  const d    = new Date(date);
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  let color = "#6B7280";
  if (diff < 0)      color = "#ef4444";
  else if (diff <= 1) color = "#f59e0b";
  else if (diff <= 3) color = "#d97706";

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-medium"
      style={{ color }}
      title={d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
    >
      {showIcon && <span>📅</span>}
      {label}
      {diff < 0 && <span className="text-[10px]"> (overdue)</span>}
    </span>
  );
}
