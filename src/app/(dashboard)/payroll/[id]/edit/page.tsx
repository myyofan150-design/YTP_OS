"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { PayrollRecord } from "@/types";
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, CheckCircle, Loader2 } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_logo_url: string | null;
}

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// ── Live payslip preview ──────────────────────────────────────────────────────
function PayslipPreview({
  company, record, bonus, otherDeduction, notes,
}: {
  company: CompanySettings;
  record: PayrollRecord;
  bonus: string;
  otherDeduction: string;
  notes: string;
}) {
  const orgName  = company.company_name || "Agency OS";
  const tagline  = company.company_tagline || "";
  const logoSrc  = resolveAssetUrl(company.company_logo_url);
  const monthName = MONTHS[(record.month ?? 1) - 1];

  const grossSalary    = Number(record.grossSalary);
  const overtimeAmount = Number(record.overtimeAmount);
  const lateDeduction  = Number(record.lateDeduction);
  const bonusVal       = parseFloat(bonus) || 0;
  const otherVal       = parseFloat(otherDeduction) || 0;
  const netSalary      = grossSalary + overtimeAmount + bonusVal - lateDeduction - otherVal;

  const emp = record.employee;

  return (
    <div className="text-xs font-sans text-slate-800" style={{ lineHeight: 1.4 }}>
      {/* Header */}
      <div className="rounded-t-lg p-4" style={{ background: "#03c4a7" }}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {logoSrc && (
              <img src={logoSrc} alt={orgName} className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5" />
            )}
            <div>
              <p className="text-lg font-bold text-white">{orgName}</p>
              {tagline && <p className="text-teal-100 text-[10px]">{tagline}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">PAYSLIP</p>
            <p className="text-teal-100 text-[10px] mt-0.5">{monthName} {record.year}</p>
          </div>
        </div>
      </div>

      {/* Employee + Period */}
      <div className="px-4 py-3 border-b border-slate-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1">Employee</p>
          <p className="font-semibold text-slate-800">{emp?.user.name ?? "—"}</p>
          <p className="text-[10px] text-slate-500 font-mono">{emp?.employeeCode}</p>
          {emp?.designation && <p className="text-[10px] text-slate-500">{emp.designation}</p>}
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1">Period</p>
          <p className="font-medium text-slate-700">{monthName} {record.year}</p>
          <p className="text-[10px] text-slate-500">Base: {fmtINR(Number(record.baseSalary))}</p>
        </div>
      </div>

      {/* Attendance */}
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-[9px] uppercase font-semibold text-slate-400 mb-2">Attendance</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Working", value: record.workingDays, red: false },
            { label: "Present", value: Number(record.presentDays).toFixed(1), red: false },
            { label: "Leave",   value: Number(record.leaveDays).toFixed(1),   red: false },
            { label: "LOP",     value: Number(record.lopDays).toFixed(1),     red: Number(record.lopDays) > 0 },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded py-1.5">
              <p className={`text-sm font-bold ${item.red ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
              <p className="text-[9px] text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="px-4 py-3 border-b border-slate-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1.5">Earnings</p>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Gross Salary</span><span>{fmtINR(grossSalary)}</span>
            </div>
            {overtimeAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Overtime</span><span>{fmtINR(overtimeAmount)}</span>
              </div>
            )}
            {bonusVal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Bonus</span><span>{fmtINR(bonusVal)}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1.5">Deductions</p>
          <div className="space-y-1">
            {lateDeduction > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>LOP Ded.</span><span className="text-red-500">-{fmtINR(lateDeduction)}</span>
              </div>
            )}
            {otherVal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Other Ded.</span><span className="text-red-500">-{fmtINR(otherVal)}</span>
              </div>
            )}
            {lateDeduction === 0 && otherVal === 0 && (
              <p className="text-[10px] text-slate-400 italic">None</p>
            )}
          </div>
        </div>
      </div>

      {/* Net salary */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-center font-bold text-white rounded px-3 py-2" style={{ background: "#03c4a7" }}>
          <span>Net Salary</span>
          <span className="text-base">{fmtINR(netSalary)}</span>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="px-4 pb-3 border-t border-slate-100">
          <p className="text-[9px] uppercase font-semibold text-slate-400 mt-2 mb-1">Notes</p>
          <p className="text-slate-600">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EditPayrollPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params["id"]);

  const [record,  setRecord]  = useState<PayrollRecord | null>(null);
  const [company, setCompany] = useState<CompanySettings>({ company_name: null, company_tagline: null, company_logo_url: null });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [bonus,           setBonus]           = useState("0");
  const [otherDeduction,  setOtherDeduction]  = useState("0");
  const [notes,           setNotes]           = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ data: PayrollRecord }>(`/payroll/${id}`),
      api.get<{ data: CompanySettings }>("/settings/general"),
    ])
      .then(([recRes, settingsRes]) => {
        const r = recRes.data.data;
        setRecord(r);
        setBonus(String(r.bonus ?? 0));
        setOtherDeduction(String(r.otherDeduction ?? 0));
        setNotes(r.notes ?? "");
        setCompany(settingsRes.data.data);
      })
      .catch(() => setError("Failed to load payroll record"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveErr("");
    try {
      await api.patch(`/payroll/${id}`, {
        bonus:          parseFloat(bonus) || 0,
        otherDeduction: parseFloat(otherDeduction) || 0,
        notes:          notes || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveErr("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-slate-500">{error || "Payroll record not found"}</p>
        <Button variant="ghost" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Edit Payroll</h1>
          <p className="text-sm text-slate-500">{record.employee?.user.name} — {MONTHS[(record.month ?? 1) - 1]} {record.year}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="bonus">Bonus (₹)</Label>
            <Input
              id="bonus"
              type="number"
              min={0}
              value={bonus}
              onChange={e => setBonus(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="otherDeduction">Other Deduction (₹)</Label>
            <Input
              id="otherDeduction"
              type="number"
              min={0}
              value={otherDeduction}
              onChange={e => setOtherDeduction(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional note on payslip…"
            />
          </div>

          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : saved ? (
              <><CheckCircle className="h-4 w-4 mr-2" />Saved!</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>

        {/* Live preview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <PayslipPreview
            company={company}
            record={record}
            bonus={bonus}
            otherDeduction={otherDeduction}
            notes={notes}
          />
        </div>
      </div>
    </div>
  );
}
