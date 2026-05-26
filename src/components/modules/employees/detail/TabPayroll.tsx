"use client";

import { Receipt } from "lucide-react";
import type { DetailTabProps } from "./types";

export function TabPayroll({ employee: _employee }: DetailTabProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm font-semibold text-foreground">Payroll Records</p>
      <p className="text-xs text-muted-foreground mt-1">Payslips and payroll history coming soon.</p>
    </div>
  );
}
