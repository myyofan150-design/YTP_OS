"use client";

import { useState } from "react";
import { ShieldCheck, Eye, EyeOff, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StepProps } from "../AddEmployeeWizard";

const ROLES = ["EMPLOYEE", "HR", "ADMIN", "SUPER_ADMIN", "ACCOUNTANT"];
const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Employee", HR: "HR", ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin", ACCOUNTANT: "Accountant",
};

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Step8SystemAccess({ formData, onChange }: StepProps) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="space-y-4">
      {/* Toggle card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">System Access</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Configure login credentials for this employee</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Create Login Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formData.createAccount
                  ? "Employee will receive login credentials via email"
                  : "Employee will not have system access — can be enabled later"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ createAccount: !formData.createAccount })}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                formData.createAccount ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  formData.createAccount ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {formData.createAccount ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCog className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Credentials & Role</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Login email, temporary password, and access level</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Work Email" required>
              <Input
                type="email"
                className="h-10 text-sm"
                placeholder="work@company.com"
                value={formData.accountEmail}
                onChange={e => onChange({ accountEmail: e.target.value })}
              />
            </Field>
            <Field label="Temporary Password" required hint="Employee will be prompted to change this on first login">
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  className="h-10 text-sm pr-10"
                  placeholder="Min 8 characters"
                  value={formData.tempPassword}
                  onChange={e => onChange({ tempPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Role Assignment">
              <Select value={formData.role} onValueChange={v => onChange({ role: v ?? "" })}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="text-sm">{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/20 px-5 py-8 text-center">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No system account will be created. You can enable access later from the employee&apos;s profile.
          </p>
        </div>
      )}
    </div>
  );
}
