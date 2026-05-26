"use client";

import { TrendingUp, TrendingDown, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";

function fmt(n: number) { return n.toLocaleString("en-IN", { maximumFractionDigits: 2 }); }

export function TabSalary({ employee, uuid, canSeeFin }: DetailTabProps) {
  const router = useRouter();

  if (!canSeeFin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">Access Restricted</p>
        <p className="text-xs text-muted-foreground mt-1">Salary information is only visible to HR, Admin, and Accountant roles.</p>
      </div>
    );
  }

  const sc         = employee.salaryComponents ?? [];
  const earnings   = sc.filter(c => c.componentType === "earning");
  const deductions = sc.filter(c => c.componentType === "deduction");
  const gross      = earnings  .reduce((s, c) => s + Number(c.amount), 0);
  const deduc      = deductions.reduce((s, c) => s + Number(c.amount), 0);
  const net        = gross - deduc;

  return (
    <div className="space-y-4">
      {/* Compensation overview */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground flex-1">Compensation</p>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=3`)}>
            <Pencil className="w-3 h-3" /> Edit Salary
          </Button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Base Salary (Monthly)</p>
            <p className="text-sm text-foreground mt-0.5">
              {employee.baseSalary ? `₹${employee.baseSalary.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">CTC (Annual)</p>
            <p className="text-sm text-foreground mt-0.5">
              {employee.ctc ? `₹${employee.ctc.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {sc.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No salary components configured yet.</p>
          <Button size="sm" variant="outline" className="mt-3 text-xs h-8"
            onClick={() => router.push(`/employees/${uuid}/edit?step=3`)}>
            Configure Salary
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-emerald-500/5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <p className="text-xs font-semibold text-foreground">Earnings</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 font-mono">₹{fmt(gross)}</span>
              </div>
              <div className="divide-y divide-border/40 px-4">
                {earnings.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-foreground/80 flex items-center gap-1.5">
                      {c.name}
                      {c.isMandatory && <span className="text-[10px] text-primary/60 bg-primary/8 px-1 rounded">req</span>}
                    </span>
                    <span className="text-xs font-mono text-foreground font-medium">₹{fmt(Number(c.amount))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-red-500/5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  </span>
                  <p className="text-xs font-semibold text-foreground">Deductions</p>
                </div>
                <span className="text-sm font-bold text-red-500 font-mono">₹{fmt(deduc)}</span>
              </div>
              <div className="divide-y divide-border/40 px-4">
                {deductions.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-foreground/80">{c.name}</span>
                    <span className="text-xs font-mono text-foreground font-medium">₹{fmt(Number(c.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Net summary */}
          <div className="rounded-2xl border border-border bg-muted/20 grid grid-cols-3 divide-x divide-border">
            {[
              ["Gross Earnings",   `₹${fmt(gross)}`, "text-emerald-600"],
              ["Total Deductions", `₹${fmt(deduc)}`, "text-red-500"],
              ["Net Take-Home",    `₹${fmt(net)}`,   "text-foreground"],
            ].map(([l, v, c]) => (
              <div key={l} className="px-5 py-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{l}</p>
                <p className={`text-lg font-bold font-mono ${c}`}>{v}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
