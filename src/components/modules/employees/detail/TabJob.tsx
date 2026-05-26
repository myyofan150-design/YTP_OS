"use client";

import { Briefcase, Calendar, FileText, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

function InfoCard({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </span>
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value?: string | number | null; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

const CONTRACT_TYPES = new Set(["contract", "internship", "freelance", "consultant"]);

export function TabJob({ employee, uuid, canEdit }: DetailTabProps) {
  const router     = useRouter();
  const isContract = CONTRACT_TYPES.has(employee.employeeType ?? "");

  // Contract expiry countdown
  let contractAlert: { color: string; msg: string } | null = null;
  if (isContract && employee.contractEndDate) {
    const daysLeft = Math.floor((new Date(employee.contractEndDate).getTime() - Date.now()) / 86400000);
    if (daysLeft < 7)
      contractAlert = { color: "border-red-200 bg-red-50 text-red-700",     msg: `Contract expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}!` };
    else if (daysLeft < 30)
      contractAlert = { color: "border-amber-200 bg-amber-50 text-amber-700", msg: `Contract expires in ${daysLeft} days` };
  }

  const probationActive = employee.probationEndDate && new Date(employee.probationEndDate) > new Date();

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=2`)}>
            <Pencil className="w-3 h-3" /> Edit Job Info
          </Button>
        </div>
      )}

      {contractAlert && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${contractAlert.color}`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {contractAlert.msg}
        </div>
      )}

      <InfoCard icon={Briefcase} title="Role">
        <Row label="Employee Type" value={employee.employeeType?.replace("_", " ")} />
        <Row label="Work Mode"     value={employee.workMode} />
        <Row label="Work Location" value={employee.workLocation} />
        <Row label="Department"    value={employee.department} />
        <Row label="Designation"   value={employee.designation} />
        {(employee.skillTags ?? []).length > 0 && (
          <div className="col-span-2 pt-1 border-t border-border/40">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {(employee.skillTags ?? []).map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}
      </InfoCard>

      <InfoCard icon={Calendar} title="Schedule & Dates">
        <Row label="Joining Date"      value={fmt(employee.joiningDate)} />
        <Row label="Probation End"     value={`${fmt(employee.probationEndDate)}${probationActive ? " · Active" : ""}`} />
        <Row label="Confirmation Date" value={fmt(employee.confirmationDate)} />
        <Row label="Shift"             value={`${employee.shiftStart ?? "—"} – ${employee.shiftEnd ?? "—"}`} />
      </InfoCard>

      {isContract && (
        <InfoCard icon={FileText} title="Contract">
          <Row label="Contract End Date" value={fmt(employee.contractEndDate)} />
          <Row label="Renewal Reminder"  value={employee.contractRenewalReminder ? `${employee.contractRenewalReminder} days before` : "—"} />
        </InfoCard>
      )}
    </div>
  );
}
