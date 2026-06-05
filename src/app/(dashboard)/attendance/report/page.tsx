"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ArrowLeft, Download, X } from "lucide-react";
import type { Employee, ApiResponse } from "@/types";

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

function fmtMins(m: number) {
  if (!m) return "0m";
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "long" });
}

interface EmployeeReport {
  employeeId: number; employeeCode: string; name: string;
  avatarUrl?: string | null; department?: string | null; designation?: string | null;
  present: number; halfDay: number; absent: number; leave: number;
  compOff: number; wfh: number; holiday: number;
  totalLateMinutes: number; totalOvertimeMinutes: number; totalWorkMinutes: number;
}
interface ReportData {
  workingDays: number; month: number; year: number; employees: EmployeeReport[];
}

function FilterSelect({ label, value, options, onChange, width = "w-40", placeholder = "All" }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; width?: string; placeholder?: string;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <Select value={value} onValueChange={v => onChange(v ?? "")}>
      <SelectTrigger className={`h-9 text-sm ${width}`}>
        <span className="flex items-center gap-1 truncate min-w-0">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function AttendanceReportPage() {
  const { user } = useAuthStore();
  const isHR     = HR_ROLES.includes(user?.role ?? "");
  const now      = new Date();

  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [empFilter, setEmpFilter]   = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [report, setReport]     = useState<ReportData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!isHR) return;
    api.get<ApiResponse<Employee[]>>("/employees").then(r => setEmployees(r.data.data)).catch(() => {});
  }, [isHR]);

  const fetchReport = useCallback(async () => {
    if (!isHR) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { month: String(month), year: String(year) };
      if (empFilter) params["employeeId"] = empFilter;
      if (deptFilter) params["department"] = deptFilter;
      const res = await api.get<ApiResponse<ReportData>>("/attendance/report", { params });
      setReport(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isHR, month, year, empFilter, deptFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function exportCSV() {
    if (!report) return;
    const rows = [["Employee","Code","Department","Designation","Present","Half Day","Absent","Leave","WFH","Comp Off","Holiday","Late (min)","Overtime (min)","Work (hrs)"]];
    report.employees.forEach(e => rows.push([
      e.name, e.employeeCode, e.department ?? "", e.designation ?? "",
      String(e.present), String(e.halfDay), String(e.absent), String(e.leave),
      String(e.wfh), String(e.compOff), String(e.holiday),
      String(e.totalLateMinutes), String(e.totalOvertimeMinutes),
      String(Math.round(e.totalWorkMinutes / 60 * 10) / 10),
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `attendance_report_${year}_${String(month).padStart(2,"0")}.csv`;
    a.click();
  }

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean) as string[])].sort();
  const monthOpts   = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }));
  const yearOpts    = [now.getFullYear() - 1, now.getFullYear()].map(y => ({ value: String(y), label: String(y) }));
  const empOpts     = employees.map(e => ({ value: String(e.id), label: e.user.name }));
  const deptOpts    = departments.map(d => ({ value: d, label: d }));
  const hasFilters  = !!(empFilter || deptFilter);

  if (!isHR) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Access denied. HR only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/attendance" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Attendance Reports</h1>
            <p className="text-xs text-muted-foreground">Monthly summary with export</p>
          </div>
        </div>
        {report && (
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 h-9">
            <Download size={14} /> Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect label="Month" value={String(month)} options={monthOpts}
          onChange={v => setMonth(v === "" ? now.getMonth() + 1 : Number(v))} width="w-44" placeholder="This Month" />
        <FilterSelect label="Year" value={String(year)} options={yearOpts}
          onChange={v => setYear(v === "" ? now.getFullYear() : Number(v))} width="w-32" placeholder="This Year" />
        <FilterSelect label="Employee" value={empFilter} options={empOpts} onChange={setEmpFilter} width="w-48" />
        <FilterSelect label="Department" value={deptFilter} options={deptOpts} onChange={setDeptFilter} width="w-44" />
        {hasFilters && (
          <button onClick={() => { setEmpFilter(""); setDeptFilter(""); }}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Summary stats */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Working Days", value: report.workingDays, color: "text-foreground" },
            { label: "Employees",    value: report.employees.length, color: "text-foreground" },
            { label: "Avg Present",  value: report.employees.length ? Math.round(report.employees.reduce((s,e) => s + e.present, 0) / report.employees.length) : 0, color: "text-emerald-600" },
            { label: "Avg Absent",   value: report.employees.length ? Math.round(report.employees.reduce((s,e) => s + e.absent, 0) / report.employees.length) : 0, color: "text-red-500" },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-8 text-center">Generating report…</p>
        ) : !report || report.employees.length === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Employee","Dept","Present","Absent","Half","Leave","WFH","Late","Overtime","Work Hrs"].map(h => (
                    <th key={h} className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.employees.map(e => (
                  <tr key={e.employeeId} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{e.employeeCode}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.department ?? "—"}</td>
                    <td className="px-3 py-3 text-center text-emerald-600 font-semibold">{e.present}</td>
                    <td className="px-3 py-3 text-center text-red-500 font-semibold">{e.absent}</td>
                    <td className="px-3 py-3 text-center text-amber-500">{e.halfDay}</td>
                    <td className="px-3 py-3 text-center text-blue-500">{e.leave}</td>
                    <td className="px-3 py-3 text-center text-cyan-500">{e.wfh}</td>
                    <td className="px-3 py-3 text-center text-amber-600 whitespace-nowrap">{fmtMins(e.totalLateMinutes)}</td>
                    <td className="px-3 py-3 text-center text-primary whitespace-nowrap">{fmtMins(e.totalOvertimeMinutes)}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">
                      {e.totalWorkMinutes ? `${Math.round(e.totalWorkMinutes / 60 * 10) / 10}h` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
