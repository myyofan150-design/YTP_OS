"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Receipt } from "lucide-react";
import api from "@/lib/api";
import type { PayrollRecord } from "@/types";
import type { DetailTabProps } from "./types";

const MONTHS = [
  "","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:    "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  PAID:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function TabPayroll({ employee }: DetailTabProps) {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<{ data: PayrollRecord[] }>(`/payroll?employeeId=${employee.id}&limit=100`)
      .then(res => setRecords(res.data.data ?? []))
      .catch(() => setError("Failed to load payroll records."))
      .finally(() => setLoading(false));
  }, [employee.id]);

  async function previewPayslip(id: number) {
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, "_blank");
    } catch {
      alert("Payslip not available yet.");
    }
  }

  async function downloadPayslip(id: number, monthLabel: string, year: number) {
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `payslip-${monthLabel}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Payslip not available yet.");
    }
  }

  if (loading) {
    return <p className="text-center py-10 text-sm text-muted-foreground">Loading payroll records…</p>;
  }

  if (error) {
    return <p className="text-center py-10 text-sm text-red-500">{error}</p>;
  }

  // Summary stats
  const paidRecords   = records.filter(r => r.status === "PAID");
  const ytdNet        = paidRecords.reduce((sum, r) => sum + Number(r.netSalary), 0);
  const latestPaid    = paidRecords[0] ?? null;
  const pendingCount  = records.filter(r => r.status !== "PAID").length;

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">YTD Net Paid</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{fmtINR(ytdNet)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Net Salary</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {latestPaid ? fmtINR(Number(latestPaid.netSalary)) : <span className="text-sm font-normal text-muted-foreground">No record</span>}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Pending / Draft</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{pendingCount}</p>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {records.length} record{records.length !== 1 ? "s" : ""}
      </p>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No Payroll Records</p>
          <p className="text-xs text-muted-foreground mt-1">Payroll has not been generated for this employee yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Working Days</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Present</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Salary</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {MONTHS[rec.month]} {rec.year}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{rec.workingDays}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{Number(rec.presentDays).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtINR(Number(rec.grossSalary))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmtINR(Number(rec.netSalary))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[rec.status] ?? STATUS_STYLE["DRAFT"]}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rec.status !== "DRAFT" ? (
                      <div className="inline-flex items-center gap-1 justify-center">
                        <button
                          onClick={() => previewPayslip(rec.id)}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Preview payslip"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => downloadPayslip(rec.id, MONTHS[rec.month]!, rec.year)}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Download payslip"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
