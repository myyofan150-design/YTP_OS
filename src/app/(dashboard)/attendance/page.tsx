"use client";

// src/app/(dashboard)/attendance/page.tsx
// EMPLOYEE: Clock-in/out widget + month calendar + summary
// HR/ADMIN: Team attendance table with daily breakdown + CSV export

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { AttendanceLog, AttendanceSummary, Employee, ApiResponse } from "@/types";

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

function fmtTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtMins(m: number) {
  const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "long" });
}

const DAY_COLORS: Record<string, string> = {
  PRESENT:  "bg-emerald-100 text-emerald-800 border-emerald-300",
  ABSENT:   "bg-red-100 text-red-700 border-red-300",
  HALF_DAY: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LEAVE:    "bg-blue-100 text-blue-700 border-blue-300",
  HOLIDAY:  "bg-purple-100 text-purple-700 border-purple-300",
  COMP_OFF: "bg-indigo-100 text-indigo-700 border-indigo-300",
  WEEKEND:  "bg-slate-50 text-slate-300 border-slate-100",
};

// ── Clock Widget ──────────────────────────────────────────────────────────
function ClockWidget({ onRefresh }: { onRefresh: () => void }) {
  const [todayLog, setTodayLog] = useState<AttendanceLog | null | undefined>(undefined);
  const [elapsed, setElapsed]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [now, setNow]           = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<AttendanceLog | null>>("/attendance/today");
      setTodayLog(res.data.data);
    } catch { setTodayLog(null); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(new Date());
      if (todayLog?.clockIn && !todayLog.clockOut) {
        const ms = Date.now() - new Date(todayLog.clockIn).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setElapsed(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [todayLog]);

  async function handleClockIn() {
    setLoading(true);
    try { await api.post("/attendance/clock-in"); fetchToday(); onRefresh(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error"); }
    finally { setLoading(false); }
  }
  async function handleClockOut() {
    setLoading(true);
    try { await api.post("/attendance/clock-out"); fetchToday(); onRefresh(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error"); }
    finally { setLoading(false); }
  }

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-bold font-mono text-slate-800">{timeStr}</p>
          <p className="text-sm text-slate-500 mt-0.5">{dateStr}</p>
        </div>

        {todayLog === undefined ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !todayLog ? (
          <Button onClick={handleClockIn} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 text-sm font-semibold rounded-lg">
            {loading ? "Clocking in…" : "🕐 Clock In"}
          </Button>
        ) : !todayLog.clockOut ? (
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500">Clocked in at <span className="font-semibold text-slate-700">{fmtTime(todayLog.clockIn)}</span></p>
              <p className="text-2xl font-bold font-mono text-indigo-600">{elapsed || "00:00:00"}</p>
              {todayLog.lateMinutes > 0 && (
                <p className="text-xs text-amber-600 font-medium">Late by {todayLog.lateMinutes} minutes</p>
              )}
            </div>
            <Button onClick={handleClockOut} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white h-10 px-6 text-sm font-semibold rounded-lg">
              {loading ? "Clocking out…" : "🕐 Clock Out"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-slate-500">Clock In</span>   <span className="font-semibold text-slate-800">{fmtTime(todayLog.clockIn)}</span>
            <span className="text-slate-500">Clock Out</span>  <span className="font-semibold text-slate-800">{fmtTime(todayLog.clockOut)}</span>
            <span className="text-slate-500">Work Hours</span> <span className="font-semibold text-slate-800">{todayLog.workMinutes ? fmtMins(todayLog.workMinutes) : "—"}</span>
            {todayLog.lateMinutes > 0 && <>
              <span className="text-slate-500">Late By</span>
              <span className="font-semibold text-amber-600">{todayLog.lateMinutes}m</span>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month Calendar (EMPLOYEE) ─────────────────────────────────────────────
function MonthCalendar({ logs, month, year }: { logs: AttendanceLog[]; month: number; year: number }) {
  const logMap = Object.fromEntries(logs.map((l) => [l.date.slice(0, 10), l]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number | null; log: AttendanceLog | null; isSunday: boolean }> = [];

  for (let i = 0; i < firstDay; i++) cells.push({ day: null, log: null, isSunday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow = new Date(year, month - 1, d).getDay();
    cells.push({ day: d, log: logMap[key] ?? null, isSunday: dow === 0 });
  }

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{monthName(month)} {year}</h3>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day) return <div key={`e${i}`} />;
          if (cell.isSunday) return (
            <div key={cell.day} className={`rounded border text-center py-1.5 text-xs ${DAY_COLORS.WEEKEND}`}>{cell.day}</div>
          );
          const type = cell.log?.type ?? "ABSENT";
          const today = new Date();
          const isToday = today.getDate() === cell.day && today.getMonth() === month - 1 && today.getFullYear() === year;
          const isFuture = new Date(year, month - 1, cell.day) > today;
          return (
            <div
              key={cell.day}
              title={cell.log ? `${type} — In: ${fmtTime(cell.log.clockIn)} Out: ${fmtTime(cell.log.clockOut)}` : "No record"}
              className={`rounded border text-center py-1.5 text-xs cursor-default
                ${isFuture ? "bg-white text-slate-300 border-slate-100" :
                  cell.log ? (DAY_COLORS[type] ?? DAY_COLORS.ABSENT) :
                  "bg-red-50 text-red-400 border-red-200"}
                ${isToday ? "ring-2 ring-indigo-400" : ""}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries({ PRESENT:"Present", ABSENT:"Absent", HALF_DAY:"Half Day", LEAVE:"Leave", WEEKEND:"Weekend" }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm border ${DAY_COLORS[k]}`} />
            <span className="text-[11px] text-slate-500">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────
function SummaryCards({ summary }: { summary: AttendanceSummary }) {
  const cards = [
    { label: "Present",   value: summary.presentDays,                   color: "text-emerald-600" },
    { label: "Absent",    value: Math.max(0, summary.absentDays),        color: "text-red-600" },
    { label: "Half Days", value: summary.halfDays,                       color: "text-yellow-600" },
    { label: "Leave",     value: summary.leaveDays,                      color: "text-blue-600" },
    { label: "Late",      value: fmtMins(summary.totalLateMinutes),      color: "text-amber-600" },
    { label: "Overtime",  value: fmtMins(summary.totalOvertimeMinutes),  color: "text-indigo-600" },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuthStore();
  const isHR     = HR_ROLES.includes(user?.role ?? "");
  const now      = new Date();

  const [month, setMonth]          = useState(now.getMonth() + 1);
  const [year, setYear]            = useState(now.getFullYear());
  const [logs, setLogs]            = useState<AttendanceLog[]>([]);
  const [summary, setSummary]      = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees]  = useState<Employee[]>([]);
  const [empFilter, setEmpFilter]  = useState("ALL");
  const [expandedEmp, setExpanded] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = { month: String(month), year: String(year) };
      if (isHR && empFilter !== "ALL") params["employeeId"] = empFilter;
      const endpoint = isHR ? "/attendance/team" : "/attendance/my-history";
      const [logsRes, sumRes] = await Promise.all([
        api.get<ApiResponse<AttendanceLog[]>>(endpoint, { params }),
        api.get<ApiResponse<AttendanceSummary>>("/attendance/summary", { params }),
      ]);
      setLogs(logsRes.data.data);
      setSummary(sumRes.data.data);
    } catch { /* ignore */ }
  }, [isHR, month, year, empFilter]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  useEffect(() => {
    if (isHR) api.get<ApiResponse<Employee[]>>("/employees").then((r) => setEmployees(r.data.data)).catch(() => {});
  }, [isHR]);

  function exportCSV() {
    const rows = [["Employee","Code","Date","Type","Clock In","Clock Out","Work Hours","Late (min)","Overtime (min)"]];
    logs.forEach((l) => rows.push([
      l.employee?.user.name ?? "",
      l.employee?.employeeCode ?? "",
      l.date.slice(0,10), l.type,
      fmtTime(l.clockIn), fmtTime(l.clockOut),
      l.workMinutes ? String(Math.round(l.workMinutes / 60 * 10) / 10) : "",
      String(l.lateMinutes), String(l.overtimeMinutes),
    ]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `attendance_${year}_${String(month).padStart(2,"0")}.csv`;
    a.click();
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }));
  const years  = [now.getFullYear() - 1, now.getFullYear()];

  // Group team logs by employee for HR table
  const empIds = [...new Set(logs.map((l) => l.employeeId))];
  const logsByEmp = Object.fromEntries(empIds.map((id) => [id, logs.filter((l) => l.employeeId === id)]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isHR ? "Team attendance overview" : "Your attendance record"}</p>
        </div>
        {isHR && (
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs">
            ↓ Export CSV
          </Button>
        )}
      </div>

      {!isHR && <ClockWidget onRefresh={() => setRefreshKey((k) => k + 1)} />}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={String(m.value)} className="text-sm">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-28 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {isHR && (
          <Select value={empFilter} onValueChange={(v) => setEmpFilter(v ?? "ALL")}>
            <SelectTrigger className="h-9 w-48 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">All Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={String(e.id)} className="text-sm">{e.user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {summary && <SummaryCards summary={summary} />}

      {/* EMPLOYEE: calendar */}
      {!isHR && <MonthCalendar logs={logs} month={month} year={year} />}

      {/* HR: team table */}
      {isHR && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Half Day</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Late</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Overtime</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {empIds.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No records for this period.</td></tr>
                ) : empIds.map((empId) => {
                  const empLogs = logsByEmp[empId] ?? [];
                  const emp    = empLogs[0]?.employee;
                  const present = empLogs.filter((l) => l.type === "PRESENT").length;
                  const half    = empLogs.filter((l) => l.type === "HALF_DAY").length;
                  const leave   = empLogs.filter((l) => l.type === "LEAVE").length;
                  const absent  = Math.max(0, (summary?.workingDays ?? 0) - present - half - leave);
                  const lateMin = empLogs.reduce((s, l) => s + l.lateMinutes, 0);
                  const otMin   = empLogs.reduce((s, l) => s + l.overtimeMinutes, 0);
                  const isOpen  = expandedEmp === empId;

                  return (
                    <>
                      <tr key={empId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{emp?.user.name ?? `Employee #${empId}`}</p>
                          <p className="text-xs text-slate-400 font-mono">{emp?.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-700 font-semibold">{present}</td>
                        <td className="px-4 py-3 text-center text-red-600 font-semibold">{absent}</td>
                        <td className="px-4 py-3 text-center text-yellow-600 font-semibold">{half}</td>
                        <td className="px-4 py-3 text-center text-amber-600">{fmtMins(lateMin)}</td>
                        <td className="px-4 py-3 text-center text-indigo-600">{fmtMins(otMin)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setExpanded(isOpen ? null : empId)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            {isOpen ? "Collapse ▲" : "Details ▼"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && empLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-50 bg-indigo-50/20">
                          <td className="px-8 py-2 text-xs text-slate-500 col-span-1">
                            {new Date(log.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                          </td>
                          <td className="px-4 py-2" colSpan={2}>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 border text-xs font-medium ${DAY_COLORS[log.type] ?? ""}`}>
                              {log.type.replace("_"," ")}
                            </span>
                            {log.isManual && <span className="ml-1 text-[11px] text-slate-400">(manual)</span>}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">{fmtTime(log.clockIn)} → {fmtTime(log.clockOut)}</td>
                          <td className="px-4 py-2 text-xs text-amber-600">{log.lateMinutes > 0 ? `${log.lateMinutes}m late` : ""}</td>
                          <td className="px-4 py-2 text-xs text-indigo-600">{log.overtimeMinutes > 0 ? `+${fmtMins(log.overtimeMinutes)}` : ""}</td>
                          <td />
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
