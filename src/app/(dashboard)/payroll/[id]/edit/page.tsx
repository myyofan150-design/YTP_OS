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
      <div className="rounded-t-lg p-4" style={{ background: "#0f766e" }}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {logoSrc && (
              <img src={logoSrc} alt={orgName} className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5" />
            )}
            <div>
              <p className="text-lg font-bold text-white">{orgName}</p>
              {tagline && <p className="text-teal-200 text-[10px]">{tagline}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">PAYSLIP</p>
            <p className="text-teal-200 text-[10px] mt-0.5">{monthName} {record.year}</p>
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
        <div className="flex justify-between items-center font-bold text-white rounded px-3 py-2" style={{ background: "#0f766e" }}>
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

  const [record, setRecord]   = useState<PayrollRecord | null>(null);
  const [company, setCompany] = useState<CompanySettings>({ company_name: null, company_tagline: null, company_logo_url: null });
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const [bonus, setBonus]               = useState("0");
  const [otherDeduction, setOtherDed]   = useState("0");
  const [notes, setNotes]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ data: PayrollRecord }>(`/payroll/${id}`),
      api.get<{ data: CompanySettings }>("/settings/general"),
    ])
      .then(([recRes, settingsRes]) => {
        const rec = recRes.data.data;
        setRecord(rec);
        setBonus(String(rec.bonus ?? 0));
        setOtherDed(String(rec.otherDeduction ?? 0));
        setNotes(rec.notes ?? "");
        setCompany(settingsRes.data.data);
      })
      .catch(() => setFetchErr("Failed to load payroll record."))
      .finally(() => setLoading(false));
  }, [id]);

  async function save(andApprove: boolean) {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/payroll/${id}`, {
        bonus:          parseFloat(bonus)         || 0,
        otherDeduction: parseFloat(otherDeduction) || 0,
        notes:          notes || null,
      });
      if (andApprove) {
        await api.patch(`/payroll/${id}/approve`);
      }
      router.push("/payroll");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (fetchErr || !record) return (
    <div className="p-6 text-center text-red-500 text-sm">{fetchErr || "Payroll record not found."}</div>
  );

  if (record.status !== "DRAFT") return (
    <div className="p-6 max-w-lg mx-auto mt-16 text-center space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-800 text-lg mb-1">Cannot Edit Payroll</p>
        <p className="text-sm text-amber-700">
          Only <strong>DRAFT</strong> records can be adjusted. This record is <strong>{record.status}</strong>.
        </p>
      </div>
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" />Go Back
      </Button>
    </div>
  );

  const monthName      = MONTHS[(record.month ?? 1) - 1];
  const grossSalary    = Number(record.grossSalary);
  const overtimeAmount = Number(record.overtimeAmount);
  const lateDeduction  = Number(record.lateDeduction);
  const bonusVal       = parseFloat(bonus) || 0;
  const otherVal       = parseFloat(otherDeduction) || 0;
  const netSalary      = grossSalary + overtimeAmount + bonusVal - lateDeduction - otherVal;
  const emp            = record.employee;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adjust Payroll</h1>
          <p className="text-sm text-gray-500">
            {emp?.user.name ?? `Employee #${record.employeeId}`} · {monthName} {record.year}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-up delay-100">
        {/* ── LEFT: Form ───────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Read-only info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Payroll Details</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Employee</p>
                <p className="font-medium text-slate-800">{emp?.user.name ?? "—"}</p>
                <p className="text-slate-500 font-mono text-xs">{emp?.employeeCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Period</p>
                <p className="font-medium text-slate-800">{monthName} {record.year}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Attendance</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                {[
                  { label: "Working", value: record.workingDays },
                  { label: "Present", value: Number(record.presentDays).toFixed(1) },
                  { label: "Leave",   value: Number(record.leaveDays).toFixed(1) },
                  { label: "LOP",     value: Number(record.lopDays).toFixed(1), red: Number(record.lopDays) > 0 },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-lg py-2">
                    <p className={`font-bold ${(item as { red?: boolean }).red ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-3 text-sm">
              {[
                { label: "Gross Salary",    value: fmtINR(grossSalary) },
                { label: "Overtime Pay",    value: fmtINR(overtimeAmount) },
                { label: "LOP Deduction",   value: `-${fmtINR(lateDeduction)}`, red: lateDeduction > 0 },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-2">
                  <p className={`font-semibold ${(item as { red?: boolean }).red ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustable fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Adjustments</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bonus (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bonus}
                  onChange={e => setBonus(e.target.value)}
                />
              </div>
              <div>
                <Label>Other Deduction (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherDeduction}
                  onChange={e => setOtherDed(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any remarks about this payroll…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Net salary summary */}
            <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Gross + Overtime + Bonus</span>
                <span>{fmtINR(grossSalary + overtimeAmount + bonusVal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Deductions</span>
                <span className="text-red-500">-{fmtINR(lateDeduction + otherVal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                <span>Net Salary</span>
                <span>{fmtINR(netSalary)}</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-primary hover:bg-primary/85 text-primary-foreground" onClick={() => save(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Save &amp; Approve
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => save(false)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />Save as Draft
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live preview ──────────────────────────────── */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live Preview</p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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
      </div>
    </div>
  );
}
