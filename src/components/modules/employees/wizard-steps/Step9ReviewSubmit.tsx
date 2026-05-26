"use client";

import { AlertCircle, CheckCircle2, Pencil, User, Briefcase, DollarSign, Landmark, Users, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepProps } from "../AddEmployeeWizard";
import { getValidationErrors } from "../AddEmployeeWizard";

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time", part_time: "Part Time", contract: "Contract",
  internship: "Internship", freelance: "Freelance",
};

function ReviewCard({
  icon: Icon, title, step, onEdit, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  step: number;
  onEdit: (s: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3 text-primary" />
        </span>
        <p className="text-xs font-semibold text-foreground flex-1">{title}</p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors font-medium"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null | boolean }) {
  const display = value === true ? "Yes" : value === false ? "No" : (value ?? "—");
  return (
    <>
      <span className="text-[11px] text-muted-foreground leading-5">{label}</span>
      <span className="text-xs text-foreground font-medium truncate leading-5">{String(display)}</span>
    </>
  );
}

export function Step9ReviewSubmit({ formData, onGoToStep, onSubmit, submitState, fileData }: StepProps) {
  const errors    = getValidationErrors(formData);
  const canSubmit = errors.length === 0;

  const docCount = Object.keys(fileData ?? {}).filter(k => k.startsWith("doc:")).length;
  const agCount  = Object.keys(fileData ?? {}).filter(k => k.startsWith("agreement:")).length;

  const earnings   = formData.salaryComponents.filter(c => c.componentType === "earning"   && (c.enabled || c.isMandatory));
  const deductions = formData.salaryComponents.filter(c => c.componentType === "deduction" && (c.enabled || c.isMandatory));
  const gross = earnings  .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const deduc = deductions.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const busy = submitState?.status === "creating" || submitState?.status === "uploading-docs" || submitState?.status === "uploading-agreements";

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {errors.length > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errors.length} required field{errors.length > 1 ? "s" : ""} need attention
          </div>
          <ul className="space-y-1 pl-6">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-destructive/80">• {e}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-medium text-emerald-700">All required fields are complete. Ready to create employee.</p>
        </div>
      )}

      {/* Summary cards */}
      <ReviewCard icon={User} title="Personal Details" step={0} onEdit={onGoToStep!}>
        <Row label="Full Name"     value={formData.name} />
        <Row label="Email"         value={formData.personalEmail} />
        <Row label="Phone"         value={formData.phone} />
        <Row label="WhatsApp"      value={formData.whatsappNumber} />
        <Row label="Date of Birth" value={formData.dateOfBirth} />
        <Row label="Gender"        value={formData.gender} />
        <Row label="Blood Group"   value={formData.bloodGroup} />
        <Row label="Nationality"   value={formData.nationality} />
        {formData.educationEntries[0]?.qualification && (
          <Row label="Education" value={formData.educationEntries[0].qualification} />
        )}
        {formData.permCity && <Row label="Permanent City" value={formData.permCity} />}
        {formData.city    && <Row label="Current City"    value={formData.city} />}
      </ReviewCard>

      <ReviewCard icon={Briefcase} title="Job Information" step={1} onEdit={onGoToStep!}>
        <Row label="Employee Type" value={formData.employeeType?.replace("_", " ")} />
        {formData.roleEntries.filter(r => r.department).map((r, i) => (
          <div key={i} className="col-span-2 grid grid-cols-2 gap-2">
            <Row label={`Dept ${i + 1}`}  value={r.department} />
            <Row label="Designation" value={r.designation} />
          </div>
        ))}
        <Row label="Joining Date" value={formData.joiningDate} />
        <Row label="Work Mode"    value={formData.workMode} />
        <Row label="Shift"        value={formData.shiftStart && formData.shiftEnd ? `${formData.shiftStart} – ${formData.shiftEnd}` : "—"} />
        {formData.skillEntries.length > 0 && (
          <Row label="Skills" value={formData.skillEntries.map(s => `${s.skill} (${s.expertiseLevel})`).join(", ")} />
        )}
      </ReviewCard>

      <ReviewCard icon={DollarSign} title="Salary Structure" step={2} onEdit={onGoToStep!}>
        <Row label="Base Salary"       value={formData.baseSalary ? `₹${Number(formData.baseSalary).toLocaleString("en-IN")} / mo` : "—"} />
        <Row label="CTC (Annual)"      value={formData.ctc ? `₹${Number(formData.ctc).toLocaleString("en-IN")}` : "—"} />
        <Row label="Gross Earnings"    value={`₹${gross.toLocaleString("en-IN")} / mo`} />
        <Row label="Total Deductions"  value={`₹${deduc.toLocaleString("en-IN")} / mo`} />
        <Row label="Net Take-Home"     value={`₹${(gross - deduc).toLocaleString("en-IN")} / mo`} />
        <Row label="Active Components" value={earnings.length + deductions.length} />
      </ReviewCard>

      <ReviewCard icon={Landmark} title="Bank & Tax" step={3} onEdit={onGoToStep!}>
        <Row label="Bank Name"    value={formData.bankName} />
        <Row label="IFSC"         value={formData.ifscCode} />
        <Row label="PAN"          value={formData.panNumber ? `${formData.panNumber.slice(0, 2)}***${formData.panNumber.slice(-3)}` : "—"} />
        <Row label="Aadhaar"      value={formData.aadhaarNumber ? `****-****-${formData.aadhaarNumber.slice(-4)}` : "—"} />
      </ReviewCard>

      <ReviewCard icon={Users} title="Emergency Contacts" step={4} onEdit={onGoToStep!}>
        {formData.emergencyContacts.map((c, i) => (
          <Row key={i} label={`Contact ${i + 1}`} value={c.name ? `${c.name}${c.relationship ? ` (${c.relationship})` : ""} • ${c.phone}` : "Not filled"} />
        ))}
      </ReviewCard>

      <ReviewCard icon={FileText} title="Documents & Agreements" step={5} onEdit={onGoToStep!}>
        <Row label="Documents selected"      value={docCount} />
        <Row label="Mandatory docs uploaded" value={`${formData.docSlots.filter(d => d.isMandatory && d.fileName).length} / 4`} />
        <Row label="Agreements selected"     value={agCount} />
      </ReviewCard>

      <ReviewCard icon={ShieldCheck} title="System Access" step={7} onEdit={onGoToStep!}>
        <Row label="Create Account" value={formData.createAccount} />
        {formData.createAccount && <Row label="Login Email" value={formData.accountEmail} />}
        {formData.createAccount && <Row label="Role"        value={formData.role} />}
      </ReviewCard>

      {/* Submit progress */}
      {submitState && submitState.status !== "idle" && (
        <div className={`rounded-2xl border px-4 py-3 text-xs font-medium ${
          submitState.status === "done"  ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
          submitState.status === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" :
                                           "border-border bg-muted/30 text-muted-foreground"
        }`}>
          {submitState.message}
        </div>
      )}

      <Button
        className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        disabled={!canSubmit || busy || submitState?.status === "done"}
        onClick={onSubmit}
      >
        {busy
          ? submitState?.message
          : submitState?.status === "done"
          ? "Employee Created Successfully!"
          : "Create Employee"}
      </Button>
    </div>
  );
}
