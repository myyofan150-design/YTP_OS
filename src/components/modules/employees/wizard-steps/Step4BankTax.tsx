"use client";

import { Landmark, CreditCard, Shield, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepProps } from "../AddEmployeeWizard";

function Section({
  icon: Icon, title, desc, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function Step4BankTax({ formData, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800">
          All bank and tax information is encrypted at rest. Only HR, Admin, and Accountant roles can view sensitive fields.
        </p>
      </div>

      {/* Bank Account */}
      <Section icon={Landmark} title="Bank Account" desc="Primary salary disbursement account">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank Name">
            <Input className="h-10 text-sm" placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={e => onChange({ bankName: e.target.value })} />
          </Field>
          <Field label="Account Holder Name">
            <Input className="h-10 text-sm" placeholder="As per bank records" value={formData.accountHolderName} onChange={e => onChange({ accountHolderName: e.target.value })} />
          </Field>
          <Field label="Account Number">
            <Input className="h-10 text-sm font-mono tracking-wider" placeholder="Account number" value={formData.accountNumber} onChange={e => onChange({ accountNumber: e.target.value })} />
          </Field>
          <Field label="IFSC Code">
            <Input
              className="h-10 text-sm font-mono uppercase tracking-wider"
              maxLength={11}
              placeholder="HDFC0001234"
              value={formData.ifscCode}
              onChange={e => onChange({ ifscCode: e.target.value.toUpperCase() })}
            />
          </Field>
        </div>
      </Section>

      {/* Tax & Identity */}
      <Section icon={CreditCard} title="Tax & Identity" desc="PAN and Aadhaar for payroll compliance">
        <div className="grid grid-cols-2 gap-4">
          <Field label="PAN Number">
            <Input
              className="h-10 text-sm font-mono uppercase tracking-widest"
              placeholder="ABCDE1234F"
              maxLength={10}
              value={formData.panNumber}
              onChange={e => onChange({ panNumber: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Aadhaar Number">
            <Input
              className="h-10 text-sm font-mono tracking-widest"
              placeholder="12-digit Aadhaar"
              maxLength={12}
              value={formData.aadhaarNumber}
              onChange={e => onChange({ aadhaarNumber: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </div>
      </Section>

      {/* Statutory */}
      <Section icon={Shield} title="Statutory" desc="UAN and ESIC — fill if applicable">
        <div className="grid grid-cols-2 gap-4">
          <Field label="UAN Number">
            <Input className="h-10 text-sm font-mono" placeholder="Universal Account No." value={formData.uanNumber} onChange={e => onChange({ uanNumber: e.target.value })} />
          </Field>
          <Field label="ESIC Number">
            <Input className="h-10 text-sm font-mono" placeholder="ESIC No." value={formData.esicNumber} onChange={e => onChange({ esicNumber: e.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}
