"use client";

// src/components/modules/employees/AddEmployeeModal.tsx
// Multi-step form: Account → Job → Bank & Tax → Emergency

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STEPS = ["Account", "Job Info", "Bank & Tax", "Emergency"] as const;
type Step = 0 | 1 | 2 | 3;

const EMPTY = {
  // Step 1 — Account
  name: "", email: "", password: "",
  // Step 2 — Job
  department: "", designation: "", joiningDate: "",
  shiftStart: "09:00", shiftEnd: "18:00", baseSalary: "",
  // Step 3 — Bank
  bankName: "", bankAccount: "", bankIfsc: "", panNumber: "",
  // Step 4 — Emergency
  emergencyContact: "", emergencyPhone: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddEmployeeModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setStep(0);
    setForm(EMPTY);
    setError("");
    onClose();
  }

  function validateStep(): string {
    if (step === 0) {
      if (!form.name.trim())    return "Name is required";
      if (!form.email.trim())   return "Email is required";
      if (!form.password)       return "Password is required";
      if (form.password.length < 8) return "Password must be at least 8 characters";
    }
    if (step === 1) {
      if (!form.joiningDate)    return "Joining date is required";
      if (!form.baseSalary)     return "Base salary is required";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => (s + 1) as Step);
  }

  function prev() {
    setError("");
    setStep((s) => (s - 1) as Step);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/employees", {
        name:             form.name,
        email:            form.email,
        password:         form.password,
        department:       form.department       || null,
        designation:      form.designation      || null,
        joiningDate:      form.joiningDate,
        shiftStart:       form.shiftStart       || "09:00",
        shiftEnd:         form.shiftEnd         || "18:00",
        baseSalary:       Number(form.baseSalary),
        bankName:         form.bankName         || null,
        bankAccount:      form.bankAccount      || null,
        bankIfsc:         form.bankIfsc         || null,
        panNumber:        form.panNumber        || null,
        emergencyContact: form.emergencyContact || null,
        emergencyPhone:   form.emergencyPhone   || null,
      });
      onCreated();
      handleClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to create employee"
      );
    } finally {
      setLoading(false);
    }
  }

  const isLast = step === 3;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">Add Employee</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 pb-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 ${
                i < step  ? "bg-indigo-600 text-white" :
                i === step ? "bg-indigo-100 text-indigo-700 border border-indigo-400" :
                             "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-indigo-700 font-medium" : "text-slate-400"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-indigo-400" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Step 0 — Account */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Full Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-sm" placeholder="Rahul Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-9 text-sm" placeholder="rahul@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Password * (min 8 chars)</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="h-9 text-sm" />
              </div>
            </>
          )}

          {/* Step 1 — Job Info */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Department</Label>
                  <Input value={form.department} onChange={(e) => set("department", e.target.value)} className="h-9 text-sm" placeholder="SEO" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Designation</Label>
                  <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} className="h-9 text-sm" placeholder="SEO Executive" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Joining Date *</Label>
                <Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Shift Start</Label>
                  <Input type="time" value={form.shiftStart} onChange={(e) => set("shiftStart", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Shift End</Label>
                  <Input type="time" value={form.shiftEnd} onChange={(e) => set("shiftEnd", e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Base Salary (₹) *</Label>
                <Input type="number" min="0" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} className="h-9 text-sm" placeholder="25000" />
              </div>
            </>
          )}

          {/* Step 2 — Bank & Tax */}
          {step === 2 && (
            <>
              <p className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2 border border-slate-200">
                Bank account and PAN are encrypted at rest. Only HR, Admin, and Accountant can view them.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Bank Name</Label>
                <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className="h-9 text-sm" placeholder="HDFC Bank" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Account Number</Label>
                  <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">IFSC Code</Label>
                  <Input value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value)} className="h-9 text-sm" placeholder="HDFC0001234" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">PAN Number</Label>
                <Input value={form.panNumber} onChange={(e) => set("panNumber", e.target.value)} className="h-9 text-sm" placeholder="ABCDE1234F" />
              </div>
            </>
          )}

          {/* Step 3 — Emergency */}
          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Emergency Contact Name</Label>
                <Input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className="h-9 text-sm" placeholder="Parent / Spouse name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Emergency Phone</Label>
                <Input value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} className="h-9 text-sm" placeholder="+91 98765 43210" />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2 flex gap-2 justify-end">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={prev} className="h-9 text-sm">
                Back
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} className="h-9 text-sm">
              Cancel
            </Button>
            {isLast ? (
              <Button
                type="submit"
                disabled={loading}
                className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
              >
                {loading ? "Creating…" : "Create Employee"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={next}
                className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
              >
                Next →
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
