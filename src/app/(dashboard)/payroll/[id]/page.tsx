"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PayrollRecord } from "@/types";
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CheckCircle, DollarSign, Pencil, Loader2, Trash2 } from "lucide-react";

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

export default function PayrollViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params["id"]);
  const { user } = useAuth();
  const isHR        = user?.role && ["SUPER_ADMIN","ADMIN","HR","ACCOUNTANT"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [record, setRecord]   = useState<PayrollRecord | null>(null);
  const [company, setCompany] = useState<CompanySettings>({ company_name: null, company_tagline: null, company_logo_url: null });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [acting, setActing]   = useState(false);
  const [actionErr, setActionErr] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ data: PayrollRecord }>(`/payroll/${id}`),
      api.get<{ data: CompanySettings }>("/settings/general"),
    ])
      .then(([recRes, settingsRes]) => {
        setRecord(recRes.data.data);
        setCompany(settingsRes.data.data);
      })
      .catch(() => setError("Failed to load payroll record."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    setActing(true); setActionErr("");
    try {
      await api.patch(`/payroll/${id}/approve`);
      setRecord(prev => prev ? { ...prev, status: "APPROVED" } : prev);
    } catch (e: unknown) {
      setActionErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to approve.");
    } finally { setActing(false); }
  }

  async function handleMarkPaid() {
    setActing(true); setActionErr("");
    try {
      await api.patch(`/payroll/${id}/mark-paid`);
      setRecord(prev => prev ? { ...prev, status: "PAID" } : prev);
    } catch (e: unknown) {
      setActionErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to mark as paid.");
    } finally { setActing(false); }
  }

  async function handleDownload() {
    if (!record) return;
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${record.employee?.employeeCode ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionErr("Payslip not available yet.");
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this payroll record? This cannot be undone.")) return;
    try {
      await api.delete(`/payroll/${id}`);
      router.push("/payroll");
    } catch (e: unknown) {
      setActionErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete.");
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (error || !record) return (
    <div className="p-6 text-center text-red-500 text-sm">{error || "Payroll record not found."}</div>
  );

  const orgName  = company.company_name || "Agency OS";
  const tagline  = company.company_tagline || "";
  const logoSrc  = resolveAssetUrl(company.company_logo_url);
  const monthName = MONTHS[(record.month ?? 1) - 1];
  const emp = record.employee;

  const grossSalary    = Number(record.grossSalary);
  const overtimeAmount = Number(record.overtimeAmount);
  const bonus          = Number(record.bonus);
  const lateDeduction  = Number(record.lateDeduction);
  const otherDeduction = Number(record.otherDeduction);
  const netSalary      = Number(record.netSalary);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{emp?.user.name ?? `Employee #${record.employeeId}`}</h1>
            <p className="text-sm text-gray-500">{monthName} {record.year} · {emp?.employeeCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isHR && record.status === "DRAFT" && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/payroll/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1.5" />Edit
            </Button>
          )}
          {isHR && record.status === "DRAFT" && (
            <Button variant="outline" size="sm" onClick={handleApprove} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
              Approve
            </Button>
          )}
          {isHR && record.status === "APPROVED" && (
            <Button size="sm" onClick={handleMarkPaid} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {acting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1.5" />}
              Mark Paid
            </Button>
          )}
          {record.status !== "DRAFT" && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />Download PDF
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
          )}
        </div>
      </div>

      {actionErr && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{actionErr}</p>
      )}

      {/* Payslip card */}
      <div className="animate-fade-up delay-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-6" style={{ background: "#03c4a7" }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              {logoSrc && (
                <img src={logoSrc} alt={orgName} className="h-16 w-auto object-contain" />
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">PAYSLIP</p>
              <p className="text-teal-200 text-sm mt-1">{monthName} {record.year}</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mt-2 border ${
                record.status === "PAID"     ? "bg-emerald-400/20 text-white border-white/20" :
                record.status === "APPROVED" ? "bg-blue-400/20 text-white border-white/20" :
                                              "bg-amber-400/20 text-white border-white/20"
              }`}>
                {record.status}
              </span>
            </div>
          </div>
        </div>

        {/* Employee details */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Employee</p>
            <p className="font-semibold text-slate-800 text-base">{emp?.user.name ?? "—"}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{emp?.employeeCode}</p>
            {emp?.designation && <p className="text-xs text-slate-500 mt-0.5">{emp.designation}</p>}
            {emp?.department  && <p className="text-xs text-slate-400 mt-0.5">{emp.department}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Period</p>
            <p className="font-medium text-slate-700">{monthName} {record.year}</p>
            <p className="text-xs text-slate-500 mt-1">Base Salary: {fmtINR(Number(record.baseSalary))}</p>
          </div>
        </div>

        {/* Attendance summary */}
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[10px] uppercase font-semibold text-slate-400 mb-3">Attendance Summary</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "Working Days", value: record.workingDays, red: false },
              { label: "Present Days", value: Number(record.presentDays).toFixed(1), red: false },
              { label: "Leave Days",   value: Number(record.leaveDays).toFixed(1),   red: false },
              { label: "LOP Days",     value: Number(record.lopDays).toFixed(1),     red: Number(record.lopDays) > 0 },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-lg py-2.5 px-2">
                <p className={`text-lg font-bold ${item.red ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-2">Earnings</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Gross Salary</span><span className="font-medium">{fmtINR(grossSalary)}</span>
              </div>
              {overtimeAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Overtime Pay</span><span>{fmtINR(overtimeAmount)}</span>
                </div>
              )}
              {bonus > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Bonus</span><span>{fmtINR(bonus)}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-2">Deductions</p>
            <div className="space-y-2 text-sm">
              {lateDeduction > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>LOP Deduction</span><span className="text-red-500">-{fmtINR(lateDeduction)}</span>
                </div>
              )}
              {otherDeduction > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Other Deduction</span><span className="text-red-500">-{fmtINR(otherDeduction)}</span>
                </div>
              )}
              {lateDeduction === 0 && otherDeduction === 0 && (
                <p className="text-xs text-slate-400 italic">No deductions</p>
              )}
            </div>
          </div>
        </div>

        {/* Net salary */}
        <div className="px-6 py-4">
          <div className="flex justify-between items-center font-bold text-white rounded-lg px-4 py-3" style={{ background: "#03c4a7" }}>
            <span className="text-base">Net Salary</span>
            <span className="text-xl">{fmtINR(netSalary)}</span>
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <div className="px-6 pb-5 border-t border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400 mt-4 mb-1.5">Notes</p>
            <p className="text-sm text-slate-600">{record.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
