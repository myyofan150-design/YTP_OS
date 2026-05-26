"use client";

import { ShieldCheck, KeyRound, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN",       label: "Admin" },
  { value: "HR",          label: "HR" },
  { value: "ACCOUNTANT",  label: "Accountant" },
  { value: "MANAGER",     label: "Manager" },
  { value: "EMPLOYEE",    label: "Employee" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function TabAccess({ employee, uuid, isAdmin }: DetailTabProps) {
  const router = useRouter();
  const userStatus = employee.user.status ?? "INACTIVE";

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=8`)}>
            <Pencil className="w-3 h-3" /> Edit Access
          </Button>
        </div>
      )}

      {/* Account info */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground flex-1">System Account</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[userStatus] ?? "bg-slate-100 text-slate-600"}`}>
            {userStatus}
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Email (Login)</p>
            <p className="text-sm text-foreground mt-0.5 font-mono">{employee.user.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Role</p>
            <p className="text-sm text-foreground mt-0.5">{ROLE_LABEL[employee.user.role ?? ""] ?? employee.user.role ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last Login</p>
            <p className="text-sm text-foreground mt-0.5">{employee.user.lastLoginAt ? fmt(employee.user.lastLoginAt) : "Never"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Account Status</p>
            <p className="text-sm text-foreground mt-0.5">{userStatus === "ACTIVE" ? "Active" : "Inactive"}</p>
          </div>
        </div>
      </div>

      {/* Role permissions */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground">Role Permissions</p>
        </div>
        <div className="p-5 space-y-3">
          {ROLES.map(r => (
            <div key={r.value} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
              (employee.user.role ?? "") === r.value
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-transparent"
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                (employee.user.role ?? "") === r.value ? "bg-primary" : "bg-muted-foreground/25"
              }`} />
              <p className={`text-xs font-medium flex-1 ${
                (employee.user.role ?? "") === r.value ? "text-foreground" : "text-muted-foreground"
              }`}>{r.label}</p>
              {(employee.user.role ?? "") === r.value && (
                <span className="text-[10px] text-primary font-semibold">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
