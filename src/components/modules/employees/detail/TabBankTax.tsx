"use client";

import { Landmark, CreditCard, Shield, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";

function InfoCard({
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
      <div className="p-5 grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono tracking-wider" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function TabBankTax({ employee, uuid, canSeeFin }: DetailTabProps) {
  const router = useRouter();

  if (!canSeeFin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">Access Restricted</p>
        <p className="text-xs text-muted-foreground mt-1">
          Bank and tax information is only visible to HR, Admin, and Accountant roles.
        </p>
      </div>
    );
  }

  const bd = employee.bankDetails;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800">
          All bank and tax information is encrypted at rest. Only HR, Admin, and Accountant roles can view this data.
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
          onClick={() => router.push(`/employees/${uuid}/edit?step=4`)}>
          <Pencil className="w-3 h-3" /> Edit Bank & Tax
        </Button>
      </div>

      <InfoCard icon={Landmark} title="Bank Account" desc="Primary salary disbursement account">
        <Row label="Bank Name"           value={bd?.bankName} />
        <Row label="Account Holder Name" value={bd?.accountHolderName} />
        <Row label="Account Number"      value={bd?.accountNumber} mono />
        <Row label="IFSC Code"           value={bd?.ifscCode} mono />
      </InfoCard>

      <InfoCard icon={CreditCard} title="Tax & Identity" desc="PAN and Aadhaar for payroll compliance">
        <Row label="PAN Number"    value={bd?.panNumber} mono />
        <Row label="Aadhaar Number" value={bd?.aadhaarNumber} mono />
      </InfoCard>

      <InfoCard icon={Shield} title="Statutory" desc="UAN and ESIC — applicable where enrolled">
        <Row label="UAN Number"  value={bd?.uanNumber} mono />
        <Row label="ESIC Number" value={bd?.esicNumber} mono />
      </InfoCard>
    </div>
  );
}
