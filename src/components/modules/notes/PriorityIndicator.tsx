"use client";

interface PriorityIndicatorProps {
  priority: string;
  showLabel?: boolean;
}

const CONFIG: Record<string, { color: string; label: string; pulse?: boolean }> = {
  low:      { color: "#22c55e", label: "Low"      },
  medium:   { color: "#f59e0b", label: "Medium"   },
  high:     { color: "#ef4444", label: "High"     },
  critical: { color: "#ef4444", label: "Critical", pulse: true },
};

export function PriorityIndicator({ priority, showLabel = false }: PriorityIndicatorProps) {
  const cfg = CONFIG[priority] ?? CONFIG["low"];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full shrink-0${cfg.pulse ? " animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}
