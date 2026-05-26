"use client";

import { Clock } from "lucide-react";
import type { DetailTabProps } from "./types";

export function TabAttendance({ employee: _employee }: DetailTabProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm font-semibold text-foreground">Attendance Records</p>
      <p className="text-xs text-muted-foreground mt-1">Detailed attendance view coming soon.</p>
    </div>
  );
}
