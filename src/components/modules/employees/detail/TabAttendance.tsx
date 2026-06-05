"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { AttendanceLog, AttendanceSummary, ApiResponse } from "@/types";
import type { DetailTabProps } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtMins(m: number) {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "long" });
}

// ── Type colours (matches attendance/page.tsx) ────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  PRESENT:  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  ABSENT:   "bg-red-500/10 text-red-500 border-red-500/20",
  HALF_DAY: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  LEAVE:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
  HOLIDAY:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
  COMP_OFF: "bg-primary/10 text-primary border-primary/20",
  WEEKEND:  "bg-muted/50 text-muted-foreground/40 border-border",
};

const TYPE_LABEL: Record<string, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  HALF_DAY: "Half Day",
  LEAVE:    "Leave",
  HOLIDAY:  "Holiday",
  COMP_OFF: "Comp Off",
};

function slotLabel(notes?: string | null) {
  if (notes === "FIRST_HALF")  return "AM";
  if (notes === "SECOND_HALF") return "PM";
  return null;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function MonthCalendar({ logs, month, year }: { logs: AttendanceLog[]; month: number; year: number }) {
  const logMap = Object.fromEntries(logs.map(l => [l.date.slice(0, 10), l]));
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today       = new Date();
  const DAYS        = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold text-foreground mb-3">{monthName(month)} {year}</h3>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day    = i + 1;
          const key    = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const log    = logMap[key] ?? null;
          const dow    = new Date(year, month - 1, day).getDay();
          const isToday   = today.getDate() === day && today.getMonth() === month - 1 && today.getFullYear() === year;
          const isFuture  = new Date(year, month - 1, day) > today;
          const isSunday  = dow === 0;
          const type      = isSunday ? "WEEKEND" : (log?.type ?? (isFuture ? null : "ABSENT"));
          const slot      = log?.notes ? slotLabel(log.notes) : null;
          const color     = type ? (TYPE_COLOR[type] ?? TYPE_COLOR.ABSENT) : "bg-card text-muted-foreground/30 border-border/50";

          const title = log
            ? `${TYPE_LABEL[log.type] ?? log.type}${slot ? ` (${slot})` : ""} — In: ${fmtTime(log.clockIn)} Out: ${fmtTime(log.clockOut)}`
            : isSunday ? "Sunday" : isFuture ? "" : "No record";

          return (
            <div
              key={day}
              title={title}
              className={`rounded-lg border text-center py-1.5 text-xs cursor-default relative ${color} ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              {day}
              {slot && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-amber-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {slot}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries({ PRESENT:"Present", ABSENT:"Absent", HALF_DAY:"Half Day", LEAVE:"Leave", COMP_OFF:"Comp Off", WEEKEND:"Weekend" }).map(([k,v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm border ${TYPE_COLOR[k]}`} />
            <span className="text-[11px] text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryRow({ summary }: { summary: AttendanceSummary }) {
  const stats = [
    { label: "Working Days", value: summary.workingDays,                          color: "text-foreground" },
    { label: "Present",      value: summary.presentDays,                          color: "text-emerald-600" },
    { label: "Absent",       value: Math.max(0, summary.absentDays),              color: "text-red-500" },
    { label: "Half Days",    value: summary.halfDays,                             color: "text-amber-500" },
    { label: "Leave",        value: summary.leaveDays,                            color: "text-blue-500" },
    { label: "Comp Off",     value: summary.compOffDays ?? 0,                     color: "text-primary" },
    { label: "Late",         value: fmtMins(summary.totalLateMinutes),            color: "text-amber-600" },
    { label: "Overtime",     value: fmtMins(summary.totalOvertimeMinutes),        color: "text-violet-600" },
  ];
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {stats.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-2.5 text-center">
          <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Daily log table ───────────────────────────────────────────────────────────

function DailyLog({ logs }: { logs: AttendanceLog[] }) {
  if (logs.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground">No attendance records for this period.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clock In</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clock Out</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Hours</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Late</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overtime</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const slot = slotLabel(log.notes);
            return (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-xs font-medium text-foreground whitespace-nowrap">
                  {new Date(log.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium ${TYPE_COLOR[log.type] ?? ""}`}>
                      {TYPE_LABEL[log.type] ?? log.type.replace("_"," ")}
                    </span>
                    {/* AM/PM badge for half-day leave slots */}
                    {log.type === "HALF_DAY" && slot && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-700">
                        {slot}
                      </span>
                    )}
                    {log.isManual && (
                      <span className="text-[10px] text-muted-foreground">(manual)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{fmtTime(log.clockIn)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{fmtTime(log.clockOut)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.workMinutes ? fmtMins(log.workMinutes) : "—"}</td>
                <td className="px-4 py-2.5 text-xs">
                  {log.lateMinutes > 0
                    ? <span className="text-amber-600 font-medium">{log.lateMinutes}m</span>
                    : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {log.overtimeMinutes > 0
                    ? <span className="text-violet-600 font-medium">+{fmtMins(log.overtimeMinutes)}</span>
                    : <span className="text-muted-foreground/40">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab component ─────────────────────────────────────────────────────────────

export function TabAttendance({ employee }: DetailTabProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [logs,    setLogs]    = useState<AttendanceLog[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: String(month), year: String(year), employeeId: String(employee.id) };
      const [logsRes, sumRes] = await Promise.all([
        api.get<ApiResponse<AttendanceLog[]>>("/attendance/team", { params }),
        api.get<ApiResponse<AttendanceSummary>>("/attendance/summary", { params }),
      ]);
      setLogs(logsRes.data.data ?? []);
      setSummary(sumRes.data.data ?? null);
    } catch {
      setLogs([]); setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [employee.id, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years  = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="space-y-4">
      {/* Month / year filter */}
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {months.map(m => (
            <option key={m} value={m}>{monthName(m)}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center py-10 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {summary && <SummaryRow summary={summary} />}
          <MonthCalendar logs={logs} month={month} year={year} />
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground">Daily Log</p>
            </div>
            <DailyLog logs={logs} />
          </div>
        </>
      )}
    </div>
  );
}
